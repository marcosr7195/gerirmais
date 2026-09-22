# Pacote técnico Lovable 02 — Fundação multiunidade e webhook de leads

**Status:** PRONTO PARA REVISÃO HUMANA — NÃO EXECUTAR EM PRODUÇÃO

**Escopo:** auditoria somente leitura do schema aditivo e da persistência local do webhook

**Data:** 2026-09-21

## Objetivo

Entregar ao Lovable contexto suficiente para revisar a fundação multiunidade e o webhook sem gerar código, aplicar migration, configurar segredos, fazer deploy ou alterar dados remotos.

Este pacote **não autoriza publicação**. A aplicação remota continua bloqueada porque o histórico de migrations local e remoto possui divergências de identidade e qualquer mudança estrutural exige backup e aprovação humana específica.

## Fonte de verdade

Revisar estes arquivos no repositório:

1. `docs/arquitetura/inventario-multiunidade.md`
2. `docs/arquitetura/2026-09-17-remote-schema-reconciliation.md`
3. `supabase/diagnostics/20260918_multiunit_backfill_exceptions_readonly.sql`
4. `supabase/migrations/20260921120000_multiunit_foundation_and_site_lead_inbox.sql`
5. `supabase/functions/_shared/site-lead-contract.ts`
6. `supabase/functions/_shared/site-lead-handler.ts`
7. `supabase/functions/site-lead-webhook/index.ts`
8. `supabase/functions/deno.json`
9. `supabase/config.toml`
10. `supabase/tests/20260921_multiunit_foundation_test.sql`
11. `supabase/tests/20260921_multiunit_security_and_ingest_test.sql`
12. `src/test/site-lead-contract.test.ts`
13. `src/test/site-lead-handler.test.ts`
14. `docs/arquitetura/2026-09-21-site-lead-webhook-contract.md`

## O que foi preparado localmente

### Schema aditivo

- `organizations`
- `legal_entities`
- `business_units`
- `organization_members`
- `business_unit_members`
- `bank_accounts`
- `bank_account_business_units`
- `proposal_sequences`
- `goals`
- `platform_admins`
- `platform_access_grants`
- `site_lead_integrations`
- `site_lead_events`
- enums `app_role` e `platform_role`
- helpers `is_org_member`, `has_bu_access` e `bu_role`
- RLS deny-by-default e leitura do inbox limitada às unidades autorizadas
- constraints compostas para impedir cruzamento entre organizações
- unicidade bancária normalizada
- timestamps automáticos nas estruturas mutáveis

Nenhuma tabela operacional legada recebeu coluna nova nesta etapa. Não houve backfill, alteração de frontend ou migração de dados existentes.

### Webhook

- endpoint local `site-lead-webhook`
- autenticação Bearer com digest HMAC-SHA-256 e separação de domínio
- `Idempotency-Key` obrigatória
- limite de corpo de 32 KiB com leitura incremental
- payload por allowlist estrita
- rejeição de qualquer identificador de organização/unidade no corpo ou metadata
- tenant derivado exclusivamente da integração autenticada
- persistência transacional com estados `created`, `duplicate` e `conflict`
- credencial revogada, inativa ou expirada rejeitada
- nenhum token, chave de idempotência ou corpo bruto persistido

### Resultado local verificado

- pgTAP fundação: **30/30**
- pgTAP segurança e ingestão: **87/87**
- Vitest: **76/76**
- TypeScript `tsc -b`: **verde**
- ESLint dos arquivos TypeScript alterados: **verde**
- build Vite: **verde**, com avisos preexistentes de CSS/chunk
- diagnóstico SQL somente leitura: executou localmente sem erro
- `git diff --check`: **verde**

### Ainda não verificado

- runtime real da Edge Function em Deno/Supabase local, porque o binário Deno/Supabase CLI não está disponível neste ambiente
- aplicação contra clone fiel do banco gerenciado da Lovable
- compatibilidade com o histórico remoto divergente
- E2E remoto
- rate limit e proteção anti-bot

## Bloqueios obrigatórios

O Lovable não deve:

- aplicar migrations;
- executar SQL no banco remoto;
- criar ou alterar tabelas remotas;
- fazer backfill;
- publicar a Edge Function;
- configurar `SITE_LEAD_CREDENTIAL_PEPPER`;
- criar token de integração real;
- alterar RLS existente;
- editar tabelas operacionais legadas;
- mudar frontend, autenticação, planos ou permissões;
- tentar reparar automaticamente o histórico de migrations.

## Prompt integral para o Lovable

```text
MODO AUDITORIA SOMENTE LEITURA.

Revise a fundação multiunidade e o webhook de leads descritos no pacote `docs/lovable/02-fundacao-multiunidade-webhook-local.md`.

REGRAS ABSOLUTAS:
1. Não altere nenhum arquivo.
2. Não gere migration nova.
3. Não aplique migration existente.
4. Não execute SQL no banco remoto.
5. Não faça deploy de Edge Function.
6. Não configure, leia, gere ou exponha segredos.
7. Não crie integração real.
8. Não altere dados, RLS, frontend ou autenticação.
9. Não tente reconciliar automaticamente o histórico de migrations.
10. Se algum passo exigir escrita, pare e classifique como BLOQUEADO POR APROVAÇÃO HUMANA.

FONTES DE VERDADE:
- `docs/arquitetura/inventario-multiunidade.md`
- `docs/arquitetura/2026-09-17-remote-schema-reconciliation.md`
- `supabase/migrations/20260921120000_multiunit_foundation_and_site_lead_inbox.sql`
- `supabase/functions/_shared/site-lead-contract.ts`
- `supabase/functions/_shared/site-lead-handler.ts`
- `supabase/functions/site-lead-webhook/index.ts`
- `supabase/tests/20260921_multiunit_foundation_test.sql`
- `supabase/tests/20260921_multiunit_security_and_ingest_test.sql`
- `docs/arquitetura/2026-09-21-site-lead-webhook-contract.md`

AUDITE:
A. se a migration é estritamente aditiva e não toca tabelas operacionais legadas;
B. se nomes canônicos são `goals` e `platform_access_grants`;
C. se todas as relações multi-tenant impedem vínculos entre organizações;
D. se RLS, GRANTs, SECURITY DEFINER/INVOKER e `search_path` não permitem bypass por `anon` ou `authenticated`;
E. se o webhook deriva organização e unidade apenas da credencial autenticada;
F. se HMAC, idempotência, revogação, expiração, validação e limites estão coerentes entre TypeScript e SQL;
G. se eventos persistidos impedem exclusão silenciosa da integração;
H. se há qualquer incompatibilidade provável com Lovable Cloud/Supabase gerenciado;
I. se o histórico remoto divergente impede aplicação automatizada;
J. quais pré-requisitos faltam para um teste em ambiente descartável.

FORMATO DA RESPOSTA:
- VERIFICADO
- RISCOS CRÍTICOS
- RISCOS NÃO CRÍTICOS
- INCOMPATIBILIDADES COM LOVABLE CLOUD
- PRÉ-REQUISITOS PARA SANDBOX DESCARTÁVEL
- AÇÕES QUE CONTINUAM BLOQUEADAS
- RECOMENDAÇÃO: NÃO APLICAR / PRONTO PARA SANDBOX / PRONTO PARA PEDIR APROVAÇÃO DE PRODUÇÃO

Não implemente correções. Para cada achado, cite arquivo e trecho. Se não puder verificar algo sem acesso remoto ou escrita, marque explicitamente como NÃO VERIFICADO.
```

## Critérios de aceite da auditoria Lovable

A auditoria só é aceita se:

1. não houver alteração de arquivo, banco, secret ou deploy;
2. cada achado citar evidência concreta;
3. separar verificado, inferido e não verificado;
4. confirmar ou negar explicitamente que a migration é aditiva;
5. avaliar o risco do histórico remoto divergente;
6. manter produção bloqueada;
7. propor primeiro um sandbox descartável ou clone sanitizado.

## Próximo gate

Após a resposta do Lovable:

1. revisar os achados localmente;
2. corrigir somente no repositório local, se necessário;
3. repetir todas as suítes;
4. preparar um plano separado para sandbox descartável;
5. solicitar aprovação humana específica antes de qualquer escrita remota.

Produção, segredos reais, deploy e tráfego real permanecem fora deste pacote.
