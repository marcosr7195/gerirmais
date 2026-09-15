# Gerir+ — Inventário técnico do vínculo por `user_id` e plano de migração multiunidade

Etapa 1 (inventário) + Etapa 2 (plano de schema/migração).
**Nenhuma migration foi executada. Nenhum dado, RLS, função, trigger, bucket, tela ou rota foi alterado.**

Data do levantamento: setembro/2026
Fontes: `supabase/migrations/*` (20 arquivos), `supabase/functions/{admin-users,kiwify-webhook}`, `src/integrations/supabase/types.ts`, telas em `src/pages/*`, componentes em `src/components/*`, `src/contexts/AuthContext.tsx`, `src/hooks/usePlan.ts`.

---

## A. Inventário do banco (16 tabelas em `public`)

Legenda de destino: **ORG** = `organization_id`, **BU** = `business_unit_id`, **AUT** = `created_by_user_id` (autoria), **USR** = manter `user_id` (dado pessoal), **PEND** = decisão pendente.

| # | Tabela | Finalidade observada | PK / FKs relevantes | Tem `user_id`? | Semântica atual do `user_id` | Destino recomendado | Relações e riscos de migração |
|---|--------|----------------------|---------------------|----------------|------------------------------|---------------------|-------------------------------|
| 1 | `profiles` | Perfil do usuário **e**, na prática, cadastro da empresa (nome, CNPJ/CPF, endereço, banco, logo, slug, plano, vencimento) | PK `id`; FK `user_id → auth.users` | Sim | Mistura três papéis: identidade do usuário, empresa/unidade e assinatura | **Dividir**: identidade → `profiles`; dados de marca/contato/slug/banco → `business_units`; CNPJ/razão social/fiscal → `legal_entities`; plano/status/vencimento → `organizations` | Maior risco do projeto. `slug` único por usuário vira único por unidade. `logo_url` aponta para `business-logos/{user_id}/…`. `plano`/`status_assinatura` são lidos por `usePlan`, `TrialBanner`, `FeatureGate`, `Admin` e `kiwify-webhook` |
| 2 | `clients` | Clientes/contatos | PK `id`; FK `user_id → auth.users` | Sim | Dono/limite de isolamento | **BU** (+ AUT) | Referenciada por `deals`, `proposals`, `service_orders`, `client_interactions`. Deduplicação por telefone hoje é por `user_id`; passará a ser por unidade |
| 3 | `deals` | Oportunidades do Kanban | PK `id`; FKs `client_id`, `user_id` | Sim | Dono/isolamento | **BU** (+ AUT) | `client_id` precisa pertencer à mesma unidade — exigirá constraint/validação. Triggers `sync_deal_lifecycle_dates`, `log_deal_stage_change` |
| 4 | `deal_items` | Itens da oportunidade | PK `id`; FKs `deal_id`, `user_id` | Sim | Redundante com o `deals.user_id` pai | **BU** herdado do pai (ou remover na fase final) | Pode ser derivado; risco baixo, mas inconsistência pai/filho é possível durante o backfill |
| 5 | `proposals` | Propostas comerciais em PDF | PK `id`; FKs `deal_id`, `client_id` | Sim | Dono/isolamento | **BU** (+ AUT) | `proposal_number` é sequencial por usuário → vira sequência **por unidade**; risco de colisão/duplicidade na migração. `business_info`/`bank_info` são snapshots JSON do `profiles` |
| 6 | `service_orders` | Ordens de serviço/entregáveis | PK `id`; FKs `deal_id`, `client_id`, `user_id` | Sim | Dono/isolamento | **BU** (+ AUT) | Trigger `log_service_order_change`; arquivamento automático depende de `completed_at` |
| 7 | `checklist_items` | Tarefas da OS, com `due_date` | PK `id`; FKs `service_order_id`, `user_id` | Sim | Redundante com a OS pai | **BU** herdado | Usado nas "Pendências de hoje" do Dashboard |
| 8 | `client_interactions` | Timeline de atendimento (manual + automática) | PK `id`; FK `client_id`; `related_entity_id` solto | Sim | Dono/isolamento | **BU** (+ AUT, para distinguir quem registrou) | `related_entity_type/id` é polimórfico e **não** tem FK — validação de unidade precisa ser feita em código/trigger |
| 9 | `transactions` | Finanças **empresariais** | PK `id`; FK `service_order_id`, `user_id` | Sim | Dono/isolamento | **BU** (+ AUT) | Base do Dashboard e do fluxo de caixa; contagens precisam bater antes/depois |
| 10 | `categories` | Categorias financeiras empresariais (semeadas no cadastro) | PK `id`; FK `user_id` | Sim | Dono/isolamento | **BU** (ou ORG com override por unidade) | **PEND**: categorias compartilhadas entre unidades ou duplicadas por unidade? `handle_new_user` semeia 19 categorias por usuário |
| 11 | `vitrine_items` | Catálogo público de serviços | PK `id` (sem FK declarada para `auth.users`) | Sim | Dono/isolamento; determina o catálogo público | **BU** | Lida pela RPC pública `get_vitrine_by_slug` via `profiles.slug`; imagens em `vitrine/{user_id}/…` |
| 12 | `financas_pessoais` | Finanças **pessoais** do indivíduo | PK `id`; FK `user_id` | Sim | Dado estritamente pessoal | **USR** (manter) | Não deve receber `business_unit_id`. Risco: backfill genérico "tudo vira unidade" contaminaria dado pessoal |
| 13 | `financas_pessoais_categorias` | Categorias pessoais | PK `id`; FK `user_id` | Sim | Dado pessoal | **USR** | Idem |
| 14 | `credit_cards` | Cartões pessoais | PK `id`; FK `user_id` | Sim | Dado pessoal | **USR** | Idem |
| 15 | `credit_card_purchases` | Compras no cartão | PK `id`; FKs `card_id`, `user_id` | Sim | Dado pessoal | **USR** | Idem |
| 16 | `credit_card_installments` | Parcelas/faturas | PK `id`; FKs `purchase_id`, `card_id`, `user_id` | Sim | Dado pessoal | **USR** | Ao pagar fatura gera lançamento em `financas_pessoais` (não em `transactions`) — fronteira pessoal/empresarial já existe e deve ser preservada |

Observações estruturais:
- Não existe hoje nenhuma tabela de organização, unidade, entidade fiscal, membros ou papéis. Não existe `user_roles`; o único "admin" é um e-mail fixo em código (`marcos7195@gmail.com`) em `AppSidebar.tsx`, `Admin.tsx` e `admin-users/index.ts`.
- `vitrine_items`, `client_interactions` e `proposals` não declaram FK para `auth.users`, ao contrário das demais.

---

## B. Segurança e acesso

### B.1 Políticas RLS
Todas as 16 tabelas têm RLS habilitado com **uma única política `ALL`** no formato:

```
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
```

Nomes: `Users manage own categories`, `…own checklist_items`, `…own client_interactions`, `…own clients`, `…own card installments`, `…own card purchases`, `…own credit cards`, `…own deal_items`, `…own deals`, `…own financas_pessoais`, `…own financas_pessoais_categorias`, `…own profile`, `…own proposals`, `…own service_orders`, `…own transactions`, `…own vitrine_items`.

Consequências:
- O isolamento é 100% "um usuário = um negócio". Não há como um segundo usuário ver dados da mesma empresa.
- As políticas são `role {public}` (não restritas a `authenticated`), dependendo apenas de `auth.uid()` não ser nulo.
- Registros filhos (`deal_items`, `checklist_items`) são protegidos pelo próprio `user_id`, não pelo pai — se o `user_id` do filho divergir do pai no backfill, surge acesso cruzado.

### B.2 Funções SQL / RPCs
| Função | SECURITY DEFINER | Exposta a anon? | Papel na multiunidade |
|---|---|---|---|
| `get_vitrine_by_slug(text)` | Sim | Sim (intencional) | Resolve `profiles.slug → user_id` e lista `vitrine_items`. Deverá resolver `slug → business_unit_id` |
| `create_vitrine_lead(...)` | Sim | Sim (grant a `anon, authenticated`) | Cria `clients` + `deals` + `deal_items` com o `user_id` do dono. Deverá gravar `business_unit_id` da unidade do slug |
| `handle_new_user()` | Sim | Não (revogado) | Cria `profiles` (trial 14 dias) + 19 categorias. Deverá criar organização + unidade padrão |
| `log_client_creation`, `log_deal_stage_change`, `log_proposal_creation`, `log_service_order_change` | Sim | Não (revogado) | Propagam `NEW.user_id` para `client_interactions`; deverão propagar `business_unit_id` |
| `sync_deal_lifecycle_dates()` | Não | — | Apenas datas; sem impacto de tenancy |
| `update_updated_at_column()` | Não | — | Sem impacto |

### B.3 Triggers
20 triggers: `on_auth_user_created` (em `auth.users`), 4 de log/auditoria, 2 de ciclo de vida de deals, e os demais `updated_at`. Todos os de log copiam `NEW.user_id` — pontos obrigatórios de atualização na fase de RLS.

### B.4 `service_role`
Usado apenas nas duas Edge Functions (`admin-users`, `kiwify-webhook`), que **ignoram RLS**. São hoje o único caminho de escrita cross-tenant e precisarão de escopo explícito de organização.

### B.5 Caminhos potenciais de acesso cruzado (hoje e no futuro)
1. `create_vitrine_lead` grava em `clients`/`deals` de outro usuário por design (definer) — a entrada é o `slug`, que é público.
2. `related_entity_id` em `client_interactions` sem FK.
3. `deal_items.user_id`/`checklist_items.user_id` independentes do pai.
4. `admin-users` faz `listUsers` completo e edita qualquer `profiles`.
5. Autorização de admin por comparação de e-mail em código, não no banco.

---

## C. Aplicação (frontend)

| Arquivo | Função/componente | Ocorrências | Natureza | Impacto |
|---|---|---|---|---|
| `src/contexts/AuthContext.tsx` | `AuthProvider.fetchProfile` | `.eq("user_id", …)` + `.single()` | Assume **um perfil = uma empresa** | Ponto central: precisará expor organização, unidades e unidade ativa. `.single()` quebra se houver mais de um contexto |
| `src/pages/Dashboard.tsx` | `loadData` (11 ocorrências) | Filtra `transactions`, `deals`, `service_orders`, `checklist_items`, `clients`, `proposals` por `user_id`; meta mensal em `localStorage` por `user.id` | Cálculo sem contexto de unidade | Todos os KPIs somam tudo do usuário; precisará de unidade ativa e/ou visão consolidada com identificação de origem |
| `src/pages/Vendas.tsx` | Kanban, novo negócio, cadastro rápido de cliente, criação de OS (8) | Filtra e grava `user_id` em `deals`, `deal_items`, `clients`, `service_orders` | Escrita | Todas as escritas devem passar a carregar a unidade ativa |
| `src/pages/Entregas.tsx` | OS + checklist (6) | Filtra/grava `user_id` | Escrita | Idem |
| `src/pages/Financas.tsx` | Lançamentos e categorias (6) | Filtra/grava; semeia categorias padrão | Escrita empresarial | Idem; semeadura passa a ser por unidade |
| `src/pages/Vitrine.tsx` | Itens + upload (3 + storage) | Filtra por `user_id`; caminho de imagem `${user.id}/…`; lê `profiles.slug` | Vitrine ligada ao usuário | Catálogo e slug passam a ser da unidade; caminho de storage muda |
| `src/pages/VitrinePublica.tsx` | Página pública + captura de lead | Usa RPCs por `slug` | Integração pública | Slug precisa resolver unidade |
| `src/pages/Marketing.tsx` | Aba Leads (3) | Filtra `deals`/`clients` por `user_id` | Analítico | Precisa de unidade ativa |
| `src/components/ProposalGenerator.tsx` | Numeração e gravação de proposta (3) | Conta propostas do usuário para gerar `PROP-00X`; grava `user_id`; usa `profile` como emissor | Sequência + identidade da empresa | Numeração por unidade; emissor vem da unidade + entidade fiscal |
| `src/components/ClientHistory.tsx` | Interação manual (1) | Grava `user_id` | Autoria | Vira `business_unit_id` + `created_by_user_id` |
| `src/pages/Configuracoes.tsx` | Perfil da empresa + logo (2) | Atualiza `profiles`; upload em `business-logos/${user.id}/logo.*` | Perfil = empresa | Será dividida em: dados pessoais, dados da unidade e dados fiscais |
| `src/pages/Onboarding.tsx` | Conclusão do cadastro (1) | Atualiza `profiles` | Assume um negócio | Passará a criar/nomear a primeira unidade |
| `src/pages/CartoesCredito.tsx`, `src/pages/FinancasPessoal.tsx` | Cartões e finanças pessoais (9 + 6) | Filtram/gravam `user_id` | **Dado pessoal — manter** | Não devem receber contexto de unidade |
| `src/pages/Admin.tsx` | Painel admin (2) | Chama `admin-users`; gate por e-mail | Administração da plataforma | Migrar para papel no banco e escopo por organização |
| `src/hooks/usePlan.ts`, `src/components/{TrialBanner,FeatureGate}.tsx` | Gating por plano | Lê `profile.plano`/`status_assinatura` | Assinatura | Plano passa a ser da **organização**, não do usuário |

Total de ocorrências de `user_id`/`user.id` classificadas no frontend: **78** (excluindo `types.ts` gerado, com 48 referências de tipo).

---

## D. Edge Functions e integrações

| Item | Situação atual | Destino |
|---|---|---|
| `admin-users` | `service_role`; autorização por e-mail fixo; ações `list`, `create` (convite + plano), `update`, `revoke`, `cleanup_test_records` (apaga por padrão de nome, **sem escopo de usuário**) | Continua ligado à **assinatura/organização**. `cleanup_test_records` é o maior risco: hoje varre todas as contas; com unidades precisa de escopo obrigatório |
| `kiwify-webhook` | `service_role`; localiza usuário por **e-mail**, grava `plano`/`status_assinatura`/`data_vencimento` em `profiles` | Continua na **organização** (assinatura é da conta, não da unidade). Deverá resolver e-mail → organização, não → unidade |
| `create_vitrine_lead` (RPC pública) | Resolve `slug → profiles.user_id` e cria cliente/deal/deal_item | Receberá `business_unit_id` derivado do slug; **nunca** aceitar unidade enviada pelo cliente |
| `get_vitrine_by_slug` (RPC pública) | Retorna dados do negócio + itens ativos | Passa a ler dados da unidade e da entidade fiscal associada |
| `handle_new_user` | Cria perfil trial + 19 categorias | Passará a criar organização, unidade padrão, vínculo de membro `proprietario` e categorias da unidade |
| API/webhooks futuros de leads por unidade (etapa 7) | Não existem | Exigirão chave/token por unidade, com a unidade derivada do token |

---

## E. Storage

| Bucket | Público | Caminho atual | Políticas | Estrutura futura proposta |
|---|---|---|---|---|
| `business-logos` | Sim | `{user_id}/logo.png\|jpg` (`Configuracoes.tsx`) | SELECT liberado por `bucket_id`; INSERT/UPDATE/DELETE exigem `auth.uid()::text = (storage.foldername(name))[1]`; política de listagem ampla já removida | `org/{organization_id}/bu/{business_unit_id}/brand/logo.*` |
| `vitrine` | Sim | `{user_id}/{uuid}.{ext}` (`Vitrine.tsx`) | Mesmas regras | `org/{organization_id}/bu/{business_unit_id}/vitrine/{uuid}.{ext}` |

Riscos: os arquivos já publicados têm URL pública gravada em `profiles.logo_url` e `vitrine_items.image_url`. A migração de caminho deve ser **cópia + reescrita de URL**, nunca movimentação destrutiva; as políticas por pasta precisam mudar de `auth.uid()` para "é membro da unidade", o que exige função auxiliar `SECURITY DEFINER`.

---

## F. Mapa de impacto

| Classificação | Ocorrências |
|---|---|
| **Autenticidade do usuário** | `auth.users`, `AuthContext`, `profiles.user_id` (parte identidade), políticas de storage por `auth.uid()` |
| **Propriedade da organização** | `profiles.plano`, `status_assinatura`, `data_inicio`, `data_vencimento`, `origem`; `kiwify-webhook`; `admin-users`; `usePlan`/`TrialBanner`/`FeatureGate` |
| **Propriedade da unidade** | `clients`, `deals`, `deal_items`, `proposals`, `service_orders`, `checklist_items`, `client_interactions`, `transactions`, `categories`, `vitrine_items`, `profiles.slug/business_name/slogan/logo_url/whatsapp/instagram/endereço/banco` |
| **Autoria/auditoria** | `client_interactions` manuais, criação de deals/OS/propostas, `is_automatic` |
| **Dado estritamente pessoal** | `financas_pessoais`, `financas_pessoais_categorias`, `credit_cards`, `credit_card_purchases`, `credit_card_installments`, meta mensal em `localStorage` |
| **Integração externa** | `create_vitrine_lead`, `get_vitrine_by_slug`, `kiwify-webhook`, `admin-users`, buckets públicos |
| **Decisão pendente** | Categorias financeiras (org vs unidade); dados fiscais/bancários (unidade vs entidade fiscal); numeração de propostas (por unidade vs por organização); escopo do admin da plataforma; se metas do dashboard viram tabela por unidade |

---

## G. Schema-alvo preliminar (proposta, **não implementada**)

```text
organizations ──< business_units >── legal_entities (N:1, entidade compartilhável)
      │                  │
      └< organization_members    └< business_unit_members
```

**`organizations`** — conta assinante.
Campos: `id uuid pk`, `name text not null`, `owner_user_id uuid not null`, `plano text`, `status_assinatura text`, `data_inicio timestamptz`, `data_vencimento timestamptz`, `origem text`, `created_at`, `updated_at`.
Índice: `owner_user_id`.

**`legal_entities`** — entidade fiscal, compartilhável entre unidades.
Campos: `id uuid pk`, `organization_id uuid not null → organizations`, `legal_name text`, `trade_name text`, `document text` (CNPJ/CPF), `fiscal_type text`, `cnaes text[]`, `municipal/state registration`, endereço fiscal, dados bancários.
Unicidade: `(organization_id, document)`. Índice: `organization_id`.

**`business_units`** — unidade operacional (marca/projeto).
Campos: `id uuid pk`, `organization_id uuid not null → organizations`, `legal_entity_id uuid null → legal_entities`, `name text not null`, `slug text`, `slogan`, `logo_url`, `whatsapp`, `commercial_email`, `instagram`, `website`, endereço operacional, `is_default boolean`, `status text`, `created_at`, `updated_at`.
Unicidade: `slug` global (vitrine pública); `(organization_id, name)`. Índices: `organization_id`, `legal_entity_id`, `slug`.

**`app_role`** (enum): `proprietario`, `administrador`, `comercial`, `operacao`, `financeiro`, `leitura`.

**`organization_members`**: `id`, `organization_id`, `user_id`, `role app_role not null`, `invited_by`, `created_at`; unique `(organization_id, user_id)`; índices em ambos.

**`business_unit_members`**: `id`, `business_unit_id`, `user_id`, `role app_role not null`, `created_at`; unique `(business_unit_id, user_id)`; índices em ambos.

Funções auxiliares `SECURITY DEFINER` previstas (para evitar recursão de RLS): `is_org_member(uuid, uuid)`, `has_bu_access(uuid, uuid)`, `bu_role(uuid, uuid)`.

Em cada tabela operacional: `business_unit_id uuid` (nullable na fase aditiva) + índice `(business_unit_id, created_at)` e, quando aplicável, `created_by_user_id uuid`.

---

## H. Plano de migração reversível (fases)

**Fase 0 — Preparação (exige aprovação humana + backup)**
Snapshot completo do banco e inventário de contagens por tabela (`count(*)` global e por `user_id`). Congelar mudanças estruturais concorrentes.

**Fase 1 — Schema aditivo**
Criar `organizations`, `legal_entities`, `business_units`, enum `app_role`, `organization_members`, `business_unit_members`, com GRANTs e RLS próprias. Nada existente é tocado.
*Rollback:* `drop` das novas tabelas (ainda sem dados de produção referenciados).

**Fase 2 — Colunas aditivas**
Adicionar `business_unit_id uuid NULL` (+ `created_by_user_id uuid NULL` onde couber) às 11 tabelas operacionais. Sem `NOT NULL`, sem FK obrigatória ainda, com índices criados `CONCURRENTLY` quando possível.
*Rollback:* `drop column` (colunas ainda não lidas pela aplicação).

**Fase 3 — Backfill**
Para cada `profiles` existente: criar 1 `organization` (herdando plano/status/vencimento/origem), 1 `legal_entity` (se houver documento), 1 `business_unit` padrão (herdando nome, slug, logo, contatos, endereço), 1 `organization_members` e 1 `business_unit_members` com papel `proprietario`.
Depois, `UPDATE … SET business_unit_id = <bu do user_id>, created_by_user_id = user_id` nas 11 tabelas operacionais. Tabelas pessoais (5) **não são tocadas**.
*Validação:* toda linha operacional com `business_unit_id NOT NULL`; contagem por `(user_id)` antes = contagem por `(business_unit_id)` depois; zero divergência pai/filho em `deal_items`/`checklist_items`.
*Rollback:* `UPDATE … SET business_unit_id = NULL` + remoção dos registros novos.

**Fase 4 — Compatibilidade dupla**
`user_id` e `business_unit_id` coexistem. Triggers passam a preencher **os dois** em inserts novos. RLS ampliada para `auth.uid() = user_id OR has_bu_access(auth.uid(), business_unit_id)` — permissiva, sem remover nada.
*Rollback:* restaurar as políticas antigas (guardadas em script).

**Fase 5 — Aplicação**
`AuthContext` passa a carregar organização, unidades e unidade ativa (persistida). Telas gravam `business_unit_id`. Seletor de unidade e visão consolidada. Sequência de propostas por unidade. Vitrine/storage por unidade (cópia de arquivos + reescrita de URL, sem apagar origem).
*Rollback:* reversão de frontend apenas — o banco continua compatível.

**Fase 6 — Endurecimento da RLS**
Após período de observação sem escritas legadas: RLS baseada exclusivamente em membros/papéis; `business_unit_id NOT NULL` + FK; storage por unidade.
*Critérios para tornar obrigatório:* zero linhas com `business_unit_id IS NULL` por 14 dias; zero escritas sem unidade nos logs; testes de isolamento 100% verdes.

**Fase 7 — Depreciação de `user_id`**
Somente após Fase 6 estável. `user_id` operacional vira `created_by_user_id` (auditoria) e deixa de ser critério de acesso. Remoção de coluna exige aprovação humana e backup.

Pontos que exigem backup ou aprovação humana explícita: Fases 0, 3, 6 e 7; qualquer mudança em caminhos de storage; qualquer alteração em `admin-users.cleanup_test_records`.

---

## I. Matriz de testes

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Usuário A consulta dados da organização B | Zero linhas em todas as 11 tabelas operacionais |
| 2 | Membro com acesso à unidade 1 consulta unidade 2 da mesma organização | Zero linhas; escrita rejeitada |
| 3 | Proprietário lista unidades da própria organização | Vê todas; nenhuma de outra organização |
| 4 | Mesma `legal_entity` vinculada a duas unidades | Documentos fiscais compartilhados; clientes, deals, OS e finanças separados |
| 5 | Criar cliente/deal/OS/lançamento com unidade ativa X | `business_unit_id = X` em todos os registros, inclusive filhos e logs automáticos |
| 6 | Edição de registro de outra unidade | Rejeitada pela RLS, não apenas pela interface |
| 7 | Visão consolidada | Mostra apenas unidades autorizadas e rotula a unidade de origem de cada linha |
| 8 | Vitrine pública de `slug` da unidade X cria lead | Cliente e deal criados na unidade X, estágio `lead`, origem "Vitrine" |
| 9 | Chamada à RPC pública com `business_unit_id` forjado no corpo | Ignorado; unidade sempre derivada do slug/token |
| 10 | Webhook Kiwify para e-mail existente | Atualiza plano da organização; nenhuma unidade escolhida pelo payload |
| 11 | `cleanup_test_records` sem escopo | Bloqueado; exige organização/unidade explícita |
| 12 | Durante Fases 4–5, conta legada sem migrar a aplicação | Todos os dados continuam visíveis e editáveis |
| 13 | Rollback da Fase 3 | Contagens de todas as tabelas idênticas ao snapshot da Fase 0 |
| 14 | Finanças pessoais e cartões | Permanecem por `user_id`, invisíveis a qualquer membro da organização |
| 15 | Duplicidade de `slug` entre unidades | Rejeitada por constraint única |
| 16 | Numeração de propostas em duas unidades | Sequências independentes, sem colisão |
