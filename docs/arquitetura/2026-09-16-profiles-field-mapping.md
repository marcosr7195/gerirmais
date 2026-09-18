# Gerir+ — Matriz campo a campo de `profiles` para o modelo multiunidade

**Status:** documentação técnica; nenhuma migration executada.

**Fonte verificada:** `src/integrations/supabase/types.ts:531-652`, migrations de criação/evolução de `profiles`, consumidores no frontend e Edge Functions.

**Objetivo:** decompor todos os campos atuais de `profiles` entre identidade do usuário, organização, unidade, entidade fiscal e conta bancária sem perda silenciosa de dados.

## Regras de migração

1. O backfill é aditivo. Nenhuma coluna atual é removida nesta etapa.
2. Cada `profiles.user_id` cria uma organização e uma unidade padrão, salvo registro prévio idempotente.
3. Valores vazios continuam nulos. Não inventar dados obrigatórios.
4. Documento fiscal conflitante, endereço ambíguo e dados bancários incompletos entram em relatório de exceção.
5. Durante a compatibilidade, o registro legado continua sendo a fonte de fallback até a validação das contagens e leituras.
6. Dados pessoais permanecem no perfil. Dados de assinatura vão para a organização. Marca/operação vão para a unidade. Fiscal vai para a entidade fiscal. Banco vai para uma conta da entidade fiscal.

## Matriz completa

| Campo atual | Destino-alvo | Transformação de backfill | Validação obrigatória |
|---|---|---|---|
| `id` | `profiles.id` | Manter sem alteração; usar apenas como referência de rastreabilidade do backfill | Um perfil por `user_id`; nenhuma duplicação |
| `user_id` | `profiles.user_id`; `organizations.owner_user_id`; memberships | Manter no perfil; criar proprietário em `organization_members` e `business_unit_members` | Usuário existe em `auth.users`; uma membership proprietária por escopo |
| `business_name` | `business_units.name` | Copiar para a unidade padrão; fallback de nome somente com regra explícita já existente | Não vazio para unidade ativa; registrar fallback usado |
| `slogan` | `business_units.slogan` | Copiar sem normalização destrutiva | Valor igual antes/depois |
| `service_type` | `business_units.service_type` | Copiar | Valor igual antes/depois |
| `slug` | `business_units.slug` | Copiar; preservar URL pública | Unicidade global; conflitos bloqueiam o registro, sem renome automático |
| `logo_url` | `business_units.logo_url` | Copiar URL atual; migração de storage será fase separada por cópia | URL antiga continua acessível; nenhuma exclusão |
| `whatsapp` | `business_units.whatsapp` | Copiar | Valor igual antes/depois |
| `commercial_email` | `business_units.commercial_email` | Copiar em minúsculas somente para comparação; preservar valor exibido | Formato válido ou exceção registrada |
| `website` | `business_units.website` | Copiar | Valor igual antes/depois |
| `instagram` | `business_units.instagram` | Copiar | Valor igual antes/depois |
| `owner_name` | `profiles.display_name` (novo campo ou equivalente) | Copiar como dado da pessoa responsável | Não confundir com razão social ou nome da unidade |
| `owner_role` | `profiles.job_title` (novo campo ou equivalente) | Copiar como descrição pessoal; não converter em permissão | Não criar `app_role` a partir deste texto |
| `company_name` | `legal_entities.legal_name` | Copiar quando existir documento fiscal ou nome jurídico | Não substituir por `business_name` sem regra explícita |
| `fiscal_type` | `legal_entities.fiscal_type` | Copiar | Valor dentro do vocabulário aceito ou exceção registrada |
| `fiscal_document` | `legal_entities.document` | Campo preferencial; normalizar apenas máscara para comparação | Dígitos válidos; conflito com `document` bloqueia backfill da entidade |
| `document` | `legal_entities.document` | Usar somente como fallback quando `fiscal_document` estiver vazio | Não sobrescrever `fiscal_document`; conflito em relatório |
| `zip_code` | `business_units.operational_zip_code`; `legal_entities.fiscal_zip_code` | Copiar provisoriamente para ambos somente no backfill inicial, com origem `legacy_profile` | Marcar endereço como pendente de confirmação se houver entidade fiscal |
| `street` | `business_units.operational_street`; `legal_entities.fiscal_street` | Mesma regra do endereço legado | Valor preservado e origem marcada |
| `number` | `business_units.operational_number`; `legal_entities.fiscal_number` | Mesma regra do endereço legado | Valor preservado e origem marcada |
| `complement` | `business_units.operational_complement`; `legal_entities.fiscal_complement` | Mesma regra do endereço legado | Valor preservado e origem marcada |
| `neighborhood` | `business_units.operational_neighborhood`; `legal_entities.fiscal_neighborhood` | Mesma regra do endereço legado | Valor preservado e origem marcada |
| `city` | `business_units.operational_city`; `legal_entities.fiscal_city` | Mesma regra do endereço legado | Valor preservado e origem marcada |
| `state` | `business_units.operational_state`; `legal_entities.fiscal_state` | Normalizar para UF apenas se reconhecida; senão preservar e sinalizar | UF válida ou exceção registrada |
| `bank_name` | `bank_accounts.bank_name` / `bank_code` | Criar conta somente junto do conjunto bancário; não inferir código bancário pelo nome sem tabela validada | Conta ligada à entidade fiscal correta |
| `account_type` | `bank_accounts.account_type` | Copiar | Valor aceito ou exceção registrada |
| `agency` | `bank_accounts.branch` | Copiar como texto, preservando zeros | Valor igual antes/depois |
| `account_number` | `bank_accounts.account_number` | Copiar como texto, preservando dígito e zeros | Valor igual antes/depois |
| `pix_key` | `bank_accounts.pix_key` | Copiar; classificar tipo somente quando determinístico | Exposição mínima e acesso financeiro |
| `account_holder` | `bank_accounts.account_holder` | Copiar; não assumir igualdade com razão social | Valor igual antes/depois |
| `plano` | `organizations.plan` | Copiar | Valor dentro dos planos reconhecidos; não alterar preço/limite |
| `status_assinatura` | `organizations.subscription_status` | Copiar | Valor dentro dos estados reconhecidos |
| `data_inicio` | `organizations.subscription_started_at` | Copiar timestamp | Igualdade temporal |
| `data_vencimento` | `organizations.subscription_expires_at` | Copiar timestamp | Igualdade temporal |
| `origem` | `organizations.acquisition_source` | Copiar | Valor igual antes/depois |
| `onboarding_completed` | `organizations.onboarding_completed` | Copiar estado da conta; a unidade padrão nasce ativa conforme regra de backfill | Não marcar verdadeiro por inferência |
| `created_at` | `profiles.created_at`; timestamps dos registros de backfill | Manter no perfil; usar como `created_at` inicial dos registros derivados quando suportado | Nenhum registro derivado anterior ao usuário sem justificativa |
| `updated_at` | `profiles.updated_at`; metadado de backfill | Manter no perfil; novos registros recebem o instante real do backfill e referência ao legado | Auditoria registra origem e instante do backfill |

## Regras específicas por grupo

### Documento fiscal

- `fiscal_document` prevalece sobre `document` apenas quando não há conflito.
- Comparar pelos dígitos normalizados.
- Se ambos existirem e divergirem, não criar automaticamente a entidade fiscal daquele perfil.
- O perfil entra no relatório `document_conflict` para decisão humana.

### Endereço legado

O schema atual não distingue endereço operacional de fiscal. Para preservar continuidade, o primeiro backfill pode copiar o mesmo conjunto para a unidade padrão e para a entidade fiscal, sempre com marcador de origem legado. Isso não declara que os endereços são conceitualmente iguais. A interface futura deve permitir confirmação e separação.

### Dados bancários

- Criar `bank_accounts` somente se existir pelo menos um identificador útil (`account_number` ou `pix_key`) e uma entidade fiscal resolvida.
- Campos parciais não são descartados: ficam em relatório de exceção sanitizado.
- A conta criada é autorizada apenas para a unidade padrão no primeiro backfill.
- Não gravar dados bancários em `business_units`.

### Papéis

`owner_role` é texto de apresentação da pessoa e não é autorização. O papel de acesso inicial do dono vem da regra de backfill e deve ser `proprietario` nas memberships, independentemente do conteúdo de `owner_role`.

## Ordem segura do backfill por perfil

1. Validar `user_id` e detectar execução anterior pela chave idempotente.
2. Criar organização.
3. Criar entidade fiscal quando os dados mínimos forem consistentes.
4. Criar unidade padrão e associar a entidade fiscal, quando existir.
5. Criar memberships de proprietário.
6. Criar conta bancária válida e sua associação à unidade.
7. Vincular categorias à organização.
8. Vincular registros operacionais à unidade e autoria.
9. Inicializar sequência de propostas com base nos números existentes.
10. Gravar resultado e exceções do perfil.

## Critérios de aceite

- Os 38 campos atuais de `profiles` estão classificados exatamente uma vez nesta matriz.
- Nenhum campo bancário tem destino em `business_units`.
- `owner_role` não gera permissão.
- Conflitos de documento não são resolvidos por inferência.
- Endereço legado conserva o valor e fica marcado como origem ambígua.
- Plano e assinatura pertencem à organização.
- `slug`, marca e contatos comerciais pertencem à unidade.
- O backfill é idempotente e produz relatório de exceções.
- As colunas legadas permanecem disponíveis até o gate de endurecimento.
- Nenhuma migration, dado, RLS, função, trigger, storage, frontend ou produção foi alterado por este documento.

## Validação pendente

O diagnóstico SQL remoto somente leitura deve confirmar nulabilidade, formatos reais, duplicidades, conflitos `document` × `fiscal_document`, completude bancária e distribuição dos valores antes da escrita do SQL de backfill.
