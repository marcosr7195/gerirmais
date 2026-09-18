# Gerir+ — reconciliação do schema remoto multiunidade

## Status

**VERIFICADO em 18/09/2026.** O diagnóstico consolidado foi executado manualmente no SQL Editor do Lovable Cloud em transação `READ ONLY`. A saída sanitizada contém 425 linhas técnicas, 14 seções e nenhum dado pessoal.

Nenhuma migration, DDL, DML, alteração de RLS, deploy ou mudança de produção foi executada.

## Evidência

- Ambiente: Lovable Cloud do projeto Gerir+.
- Proteção observada: `transaction_read_only = on`.
- Banco/papel reportados pelo editor: `postgres`/`postgres`.
- Artefato executado: consulta consolidada derivada de `supabase/diagnostics/20260915_multiunit_preflight_readonly.sql`.
- Saída bruta: mantida fora do repositório.
- Registro operacional: página “SQL — Diagnóstico multiunidade consolidado para CSV — Gerir+” no Notion.

## Inventário remoto sanitizado

| Seção | Quantidade |
|---|---:|
| Migrations | 20 |
| Tabelas públicas | 16 |
| Colunas públicas | 215 |
| Linhas de constraints | 51 |
| Índices | 25 |
| Policies de `public` e `storage` | 22 |
| Funções públicas | 9 |
| Eventos de triggers | 20 |
| Buckets | 2 |
| Tabelas com contagem agregada | 16 |
| Relações pai/filho verificadas | 12 |

O total agregado nas 16 tabelas foi 1.077 registros. Esse número é apenas baseline de preservação; não identifica pessoas nem conteúdo de negócio.

## Matriz de reconciliação

| Item | Local | Remoto | Estado | Impacto | Ação antes da migration |
|---|---|---|---|---|---|
| Migrations | 20 arquivos | 20 entradas | Divergente na identidade de 18/20 versões | **bloqueia migration** automatizada | Aceitar formalmente o legado do Lovable ou reparar o histórico por procedimento aprovado; não executar `db push` enquanto estiver ambíguo |
| Tabelas `public` | 16 esperadas | 16 encontradas | Alinhado | sem impacto | Preservar baseline |
| Schema final legado | Objetos previstos pelas 20 migrations | Objetos observados compatíveis | Sem drift estrutural comprovado no escopo capturado | sem impacto | Não confundir compatibilidade estrutural com equivalência byte a byte das migrations |
| RLS | 16 tabelas esperadas com RLS | 16 habilitadas; nenhuma com RLS forçada | Legado alinhado | legado aceito | Planejar transição para policies por organização/unidade e avaliar `FORCE ROW LEVEL SECURITY` |
| Policies | Modelo legado por `user_id` | Todas as 16 tabelas têm policy; predominam `ALL`, papel `public`, modo permissivo | Legado alinhado | corrigir no plano | Substituir gradualmente após testes de compatibilidade e isolamento |
| Funções | 9 públicas | 9 encontradas; 7 `SECURITY DEFINER` | Quantidade alinhada; segurança interna não comprovada | corrigir no plano | Auditar corpo, ACL, `search_path`, qualificação de schema e privilégio de execução |
| Triggers | 17 esperados | 17 distintos, representados por 20 eventos | Alinhado | sem impacto | Revisar dependências de `user_id` antes do backfill |
| Buckets | `business-logos`, `vitrine` | Ambos presentes e públicos | Alinhado | legado aceito | Confirmar leitura pública; definir limite de tamanho e MIME |
| Integridade de usuários | Sem nulos/órfãos | Zero nas 11 tabelas verificadas | Alinhado | sem impacto para o diagnóstico | Completar a mesma verificação nas cinco tabelas pessoais |
| Relações pai/filho | Mesmo proprietário | Zero divergências nas 12 relações verificadas | Alinhado | sem impacto para o diagnóstico | Criar enforcement multitenant futuro; o estado atual não impede nova divergência |
| Estrutura multiunidade | Ainda não aplicada | Ausente | Baseline esperado | bloqueia migration direta sem testes | Fechar exceções, nomes canônicos e testes antes de qualquer DDL |

## Reconciliação das versões de migration

A ordem relativa é idêntica e cada versão divergente possui um par provável por posição e proximidade temporal. Entretanto, versões distintas são identidades distintas para o mecanismo de migrations.

| # | Versão local | Versão remota | Estado |
|---:|---|---|---|
| 1 | `20260407224410` | `20260407224406` | legado provável; identidade divergente |
| 2 | `20260410144148` | `20260410144146` | legado provável; identidade divergente |
| 3 | `20260410150929` | `20260410150927` | legado provável; identidade divergente |
| 4 | `20260410230555` | `20260410230553` | legado provável; identidade divergente |
| 5 | `20260413043318` | `20260413043316` | legado provável; identidade divergente |
| 6 | `20260413044221` | `20260413044219` | legado provável; identidade divergente |
| 7 | `20260416071627` | `20260416071624` | legado provável; identidade divergente |
| 8 | `20260416072350` | `20260416072348` | legado provável; identidade divergente |
| 9 | `20260417131257` | `20260417131255` | legado provável; identidade divergente |
| 10 | `20260422192622` | `20260422192620` | legado provável; identidade divergente |
| 11 | `20260428203647` | `20260428203645` | legado provável; identidade divergente |
| 12 | `20260516172547` | `20260516172544` | legado provável; identidade divergente |
| 13 | `20260519164814` | `20260519164812` | legado provável; identidade divergente |
| 14 | `20260625172412` | `20260625172410` | legado provável; identidade divergente |
| 15 | `20260630133629` | `20260630133627` | legado provável; identidade divergente |
| 16 | `20260630151636` | `20260630151633` | legado provável; identidade divergente |
| 17 | `20260702165547` | `20260702165545` | legado provável; identidade divergente |
| 18 | `20260728212832` | `20260728212835` | nome remoto aponta para a versão local, mas a identidade diverge |
| 19 | `20260908145153` | `20260908145153` | igual |
| 20 | `20260908150627` | `20260908150627` | igual |

As 17 primeiras migrations remotas não preservam nome útil. A entrada remota `20260728212835` registra no nome o stem local iniciado por `20260728212832`. Isso sustenta o pareamento provável, mas não comprova igualdade de conteúdo ou checksum.

## Integridade e isolamento observados

### Evidências positivas

- `user_id` nulo nas 11 tabelas auditadas: **0**.
- usuário órfão nas 11 tabelas auditadas: **0**.
- divergência de `user_id` nas 12 relações pai/filho auditadas: **0**.
- todas as 16 tabelas têm RLS habilitada e ao menos uma policy.
- todas as 16 tabelas possuem chave primária.

### Necessário antes da migration

1. Auditar as sete funções `SECURITY DEFINER`:
   - `create_vitrine_lead`;
   - `get_vitrine_by_slug`;
   - `handle_new_user`;
   - `log_client_creation`;
   - `log_deal_stage_change`;
   - `log_proposal_creation`;
   - `log_service_order_change`.
2. Confirmar `search_path`, ACL, grants e menor privilégio dessas funções.
3. Definir enforcement futuro para impedir relações pai/filho entre tenants diferentes.
4. Verificar as cinco tabelas pessoais que não entraram na auditoria explícita de nulos/órfãos.
5. Avaliar FKs de proprietário ausentes em `categories`, `client_interactions`, `proposals` e `vitrine_items`.
6. Planejar índices por `user_id`/tenant e por FKs com base nas consultas reais.
7. Confirmar que os buckets públicos são intencionais e definir limites de tamanho e MIME.

## Prontidão multiunidade

O remoto ainda está integralmente no modelo legado “um usuário = um negócio”. Não existem:

- `organizations`;
- `legal_entities`;
- `business_units`;
- `organization_members`;
- `business_unit_members`;
- `bank_accounts` e associação conta–unidade;
- sequência de propostas por unidade;
- metas por unidade/período;
- administração de plataforma e grants temporários de suporte;
- helpers e policies RLS por organização/unidade;
- colunas `organization_id` ou `business_unit_id` nas tabelas atuais.

Essa ausência é o baseline esperado. Não autoriza criar as estruturas até que os gates abaixo sejam fechados.

## Matriz de exceções para backfill

| Exceção | Quantidade | Pode automatizar? | Tratamento | Bloqueia qual fase? |
|---|---:|---|---|---|
| `user_id` nulo nas 11 tabelas auditadas | 0 | Sim | preservar e revalidar antes/depois | Não bloqueia no estado atual |
| usuário órfão nas 11 tabelas auditadas | 0 | Sim | preservar e revalidar antes/depois | Não bloqueia no estado atual |
| conflito pai/filho nas 12 relações | 0 | Sim | preservar e revalidar antes/depois | Não bloqueia no estado atual |
| `document` × `fiscal_document` | não medido | Não | consulta agregada e decisão humana | Entidade fiscal automática |
| slug duplicado após normalização | não medido | Não | consulta agregada; não renomear por inferência | Ativação da unidade/vitrine afetada |
| dados bancários incompletos | não medido | Parcial | relatório agregado; não criar conta inválida | Conta bancária automática |
| nome utilizável para unidade | não medido | Parcial | regra explícita de fallback | Unidade automática |
| sequência legada de propostas | não medido | Parcial | inventariar antes de criar sequência por unidade | Numeração futura |
| categoria textual de transação | não medido | Parcial | definir mapeamento para catálogo organizacional | Migração de categoria |

## Inconsistências da especificação a resolver

1. Escolher nomes canônicos entre `goals`/`dashboard_goals` e `platform_access_grants`/`support_access_grants`.
2. Congelar a lista exata de tabelas por unidade; a classificação atual aponta nove tabelas operacionais, não apenas uma quantidade genérica.
3. Definir a estratégia aditiva para `transactions.category_id`, pois o remoto possui apenas `transactions.category` textual.
4. Incluir explicitamente a sequência e o prefixo de propostas por unidade no plano de compatibilidade.
5. Garantir que dados bancários residam em `bank_accounts`, ligados a `legal_entities`, sem duplicação no cadastro fiscal.

## Classificação final

- **Diagnóstico remoto:** concluído e verificado.
- **Schema estrutural legado:** compatível com o repositório no escopo observável.
- **Histórico de migrations:** divergente em 18/20 identidades; bloqueia operação automática de migration até decisão formal.
- **Integridade atual:** favorável; nenhum nulo, órfão ou conflito detectado no escopo auditado.
- **Prontidão para backfill:** parcial; exceções de `profiles`, propostas e categorias ainda não foram quantificadas.
- **Prontidão para DDL/migration remota:** não autorizada.

## Próximo gate recomendado

Executar uma consulta complementar estritamente somente leitura e agregada para quantificar:

1. conflito entre `document` e `fiscal_document`;
2. perfis sem nome utilizável;
3. slugs ausentes ou colidentes após normalização;
4. conjuntos bancários incompletos;
5. sequência legada de propostas;
6. capacidade de mapear `transactions.category` ao catálogo organizacional;
7. nulos/órfãos nas cinco tabelas pessoais.

Depois, fechar os nomes canônicos e pedir autorização específica apenas para criar testes locais que falhem. Nenhuma migration deve ser criada ou aplicada antes desse gate.
