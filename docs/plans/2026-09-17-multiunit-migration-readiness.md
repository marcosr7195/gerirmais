# Gerir+ Multiunit Migration Readiness Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Transformar o inventário multiunidade já concluído em um pacote de migration reversível, testado localmente e pronto para aprovação humana, sem alterar produção.

**Architecture:** A evolução será aditiva e dividida em gates. Primeiro, o diagnóstico remoto somente leitura reconcilia o banco efetivo com o repositório. Depois, migrations pequenas criam a estrutura nova, adicionam colunas compatíveis, executam backfill idempotente e validam contagens antes de qualquer endurecimento de RLS. O `user_id` legado permanece como fallback até os gates de compatibilidade e isolamento passarem.

**Tech Stack:** PostgreSQL/Supabase, SQL migrations, RLS, PL/pgSQL, React 18, TypeScript, Vite, Vitest.

---

## Pré-condições e limites

- Fonte conceitual: `docs/arquitetura/inventario-multiunidade.md`.
- Matriz de decomposição: `docs/arquitetura/2026-09-16-profiles-field-mapping.md`.
- Diagnóstico preparado: `supabase/diagnostics/20260915_multiunit_preflight_readonly.sql`.
- Não executar migration, backfill, alteração de RLS, deploy ou mudança em produção sem backup e aprovação humana no gate correspondente.
- Nunca registrar URL de banco, token, UUID de usuário, documento, dado bancário ou conteúdo de cliente em commits ou no Notion.
- As cinco tabelas pessoais permanecem por `user_id`: `financas_pessoais`, `financas_pessoais_categorias`, `credit_cards`, `credit_card_purchases`, `credit_card_installments`.
- Cada tarefa termina em commit local separado. Não fazer push para `main`.

## Task 1: Registrar o baseline local antes do diagnóstico remoto

**Objective:** Fixar o estado do repositório e impedir comparação contra uma referência ambígua.

**Files:**
- Modify: `docs/arquitetura/2026-09-15-multiunit-remote-preflight.md`
- Create: `docs/arquitetura/evidencias/.gitkeep`

**Step 1: Confirmar branch e baseline**

Run:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
```

Expected: branch segura `planning/multiunit-preflight-20260915`; hashes exibidos; nenhuma mudança inesperada rastreada.

**Step 2: Registrar somente hashes e data UTC no runbook**

Adicionar em `docs/arquitetura/2026-09-15-multiunit-remote-preflight.md`:

```markdown
## Baseline da execução

- Branch: `planning/multiunit-preflight-20260915`
- Commit local: `<HEAD>`
- Referência remota: `<origin/main>`
- Executado em UTC: `<AAAA-MM-DDTHH:MM:SSZ>`
```

**Step 3: Verificar que não há segredo no diff**

Run:

```bash
git diff --check
git diff -- docs/arquitetura/2026-09-15-multiunit-remote-preflight.md
```

Expected: sem erro de whitespace; diff contém apenas metadados técnicos não sensíveis.

**Step 4: Commit**

```bash
git add docs/arquitetura/2026-09-15-multiunit-remote-preflight.md docs/arquitetura/evidencias/.gitkeep
git commit -m "docs: record multiunit diagnostic baseline"
```

## Task 2: Validar estaticamente que o diagnóstico continua somente leitura

**Objective:** Bloquear execução se o arquivo SQL passar a conter comandos mutáveis.

**Files:**
- Create: `src/test/multiunit-preflight-sql.test.ts`
- Test: `src/test/multiunit-preflight-sql.test.ts`

**Step 1: Escrever o teste que falha se o SQL não for transacional e somente leitura**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sqlPath = resolve(
  process.cwd(),
  "supabase/diagnostics/20260915_multiunit_preflight_readonly.sql",
);

function executableSql(source: string) {
  return source
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'(?:''|[^'])*'/g, "''")
    .toLowerCase();
}

describe("multiunit remote preflight", () => {
  const sql = readFileSync(sqlPath, "utf8");
  const executable = executableSql(sql);

  it("opens an explicit read-only transaction", () => {
    expect(executable).toMatch(/begin\s+transaction\s+read\s+only\s*;/);
  });

  it("sets a bounded statement timeout", () => {
    expect(executable).toMatch(/set\s+local\s+statement_timeout\s*=/);
  });

  it("contains no mutating statement", () => {
    expect(executable).not.toMatch(
      /\b(insert|update|delete|merge|truncate|create|alter|drop|grant|revoke|call|copy|do)\b/,
    );
  });

  it("ends the transaction", () => {
    expect(executable.trim()).toMatch(/commit\s*;$/);
  });
});
```

**Step 2: Rodar o teste e confirmar o resultado atual**

Run:

```bash
npm test -- src/test/multiunit-preflight-sql.test.ts
```

Expected: quatro testes verdes. Se falhar, não executar o SQL remoto; corrigir o diagnóstico em tarefa separada e revisar novamente.

**Step 3: Rodar a suíte completa**

Run:

```bash
npm test
```

Expected: suíte completa verde.

**Step 4: Commit**

```bash
git add src/test/multiunit-preflight-sql.test.ts
git commit -m "test: guard read-only multiunit preflight"
```

## Task 3: Executar o diagnóstico remoto uma única vez

**Objective:** Capturar metadados e agregados do ambiente correto sem mutação nem exposição de dados.

**Files:**
- Read: `supabase/diagnostics/20260915_multiunit_preflight_readonly.sql`
- Create locally, never commit raw output: `/tmp/gerirmais-multiunit-preflight-<timestamp>.txt`
- Modify: `docs/arquitetura/2026-09-15-multiunit-remote-preflight.md`

**Step 1: Confirmar pré-requisitos sem imprimir credenciais**

Run:

```bash
command -v psql
test -n "$DATABASE_URL"
printf 'database_url_present=yes\n'
```

Expected: caminho do `psql` e `database_url_present=yes`. Se qualquer comando falhar, marcar a tarefa como bloqueada sem tentar outro acesso.

**Step 2: Executar em transação única**

Run:

```bash
umask 077
output="/tmp/gerirmais-multiunit-preflight-$(date -u +%Y%m%dT%H%M%SZ).txt"
psql "$DATABASE_URL" \
  -X \
  -v ON_ERROR_STOP=1 \
  -f supabase/diagnostics/20260915_multiunit_preflight_readonly.sql \
  > "$output"
printf 'output=%s\n' "$output"
```

Expected: exit code `0`; saída em arquivo privado; transação termina com `COMMIT`.

**Step 3: Confirmar que nenhuma credencial entrou no shell output ou Git**

Run:

```bash
git status --short
```

Expected: nenhum arquivo de resultado bruto dentro do repositório.

**Step 4: Registrar somente evidência sanitizada**

No runbook, registrar data, ambiente lógico (`staging`, `cópia` ou `produção somente leitura`), exit code e caminho local temporário. Não copiar IDs pessoais, documentos, dados bancários nem a URL do banco.

**Step 5: Commit**

```bash
git add docs/arquitetura/2026-09-15-multiunit-remote-preflight.md
git commit -m "docs: record remote multiunit diagnostic"
```

## Task 4: Reconciliar migrations locais e remotas

**Objective:** Listar diferenças concretas antes de escrever qualquer DDL.

**Files:**
- Create: `docs/arquitetura/2026-09-17-remote-schema-reconciliation.md`
- Read: `supabase/migrations/*.sql`
- Read locally: `/tmp/gerirmais-multiunit-preflight-<timestamp>.txt`

**Step 1: Criar tabela de reconciliação**

```markdown
| Item | Local | Remoto | Estado | Impacto | Ação antes da migration |
|---|---|---|---|---|---|
| Migrations | 20 arquivos | <quantidade> | Igual/Divergente | <impacto> | <ação> |
| Tabelas public | 16 esperadas | <quantidade> | Igual/Divergente | <impacto> | <ação> |
| RLS | 16 esperadas habilitadas | <resultado> | Igual/Divergente | <impacto> | <ação> |
| Funções | 7 esperadas | <resultado> | Igual/Divergente | <impacto> | <ação> |
| Triggers | 17 esperados | <resultado> | Igual/Divergente | <impacto> | <ação> |
| Buckets | business-logos, vitrine | <resultado> | Igual/Divergente | <impacto> | <ação> |
```

**Step 2: Classificar cada divergência**

Usar somente: `bloqueia migration`, `corrigir no plano`, `legado aceito`, `sem impacto`.

**Step 3: Verificar o documento**

Run:

```bash
git diff --check
git diff -- docs/arquitetura/2026-09-17-remote-schema-reconciliation.md
```

Expected: cada diferença tem impacto e ação; nenhum dado de cliente aparece.

**Step 4: Commit**

```bash
git add docs/arquitetura/2026-09-17-remote-schema-reconciliation.md
git commit -m "docs: reconcile remote and local schemas"
```

## Task 5: Quantificar exceções do backfill

**Objective:** Converter as contagens remotas em critérios objetivos de bloqueio ou tratamento.

**Files:**
- Modify: `docs/arquitetura/2026-09-17-remote-schema-reconciliation.md`
- Read: `docs/arquitetura/2026-09-16-profiles-field-mapping.md`

**Step 1: Adicionar a matriz agregada de exceções**

```markdown
| Exceção | Quantidade | Pode automatizar? | Tratamento | Bloqueia qual fase? |
|---|---:|---|---|---|
| `user_id` nulo | <n> | Não | corrigir origem | Backfill |
| usuário órfão | <n> | Não | inventariar e decidir | Backfill |
| conflito pai/filho | <n> | Não | reconciliar antes de copiar tenant | Backfill |
| `document` x `fiscal_document` | <n> | Não | relatório humano | Entidade fiscal |
| slug duplicado | <n> | Não | decisão explícita, sem renome automático | Unidade/vitrine |
| banco incompleto | <n> | Parcial | preservar em relatório; não criar conta inválida | Conta bancária |
```

**Step 2: Definir gates**

- `user_id` nulo ou órfão em tabela operacional: bloqueia backfill daquela tabela.
- divergência pai/filho: bloqueia RLS por unidade e deve ser reconciliada antes.
- documento fiscal conflitante: não bloqueia organização/unidade, mas bloqueia criação automática da entidade fiscal do perfil.
- dado bancário incompleto: não bloqueia unidade; bloqueia somente a conta bancária automática.
- slug duplicado: bloqueia ativação da vitrine da unidade afetada.

**Step 3: Verificar que nenhuma exceção foi “corrigida” por inferência**

Expected: todas as exceções têm tratamento conservador e trilha de decisão.

**Step 4: Commit**

```bash
git add docs/arquitetura/2026-09-17-remote-schema-reconciliation.md
git commit -m "docs: define multiunit backfill exception gates"
```

## Task 6: Criar o teste de schema para a migration estrutural aditiva

**Objective:** Especificar, antes do DDL, as tabelas, chaves e isolamento mínimos da nova base.

**Files:**
- Create: `supabase/tests/20260917_multiunit_foundation_test.sql`
- Test: `supabase/tests/20260917_multiunit_foundation_test.sql`

**Step 1: Escrever asserts que falham antes da migration**

O teste deve verificar com `to_regclass` e catálogos:

```sql
begin;

select plan(12);
select has_table('public', 'organizations');
select has_table('public', 'legal_entities');
select has_table('public', 'business_units');
select has_table('public', 'organization_members');
select has_table('public', 'business_unit_members');
select has_table('public', 'bank_accounts');
select has_table('public', 'bank_account_business_units');
select has_table('public', 'proposal_sequences');
select has_table('public', 'dashboard_goals');
select has_table('public', 'platform_admins');
select has_table('public', 'support_access_grants');
select enum_has_labels('public', 'app_role', array['proprietario','administrador','comercial','operacao','financeiro','leitura']);

select * from finish();
rollback;
```

**Step 2: Rodar no Supabase local**

Run:

```bash
supabase start
supabase db reset
supabase test db supabase/tests/20260917_multiunit_foundation_test.sql
```

Expected: FAIL porque as tabelas ainda não existem.

**Step 3: Commit**

```bash
git add supabase/tests/20260917_multiunit_foundation_test.sql
git commit -m "test: specify multiunit foundation schema"
```

## Task 7: Criar a migration estrutural mínima

**Objective:** Implementar somente as estruturas novas, sem tocar registros existentes.

**Files:**
- Create: `supabase/migrations/<timestamp>_multiunit_foundation.sql`
- Test: `supabase/tests/20260917_multiunit_foundation_test.sql`

**Step 1: Implementar enum e tabelas no menor DDL possível**

Incluir as estruturas definidas em `docs/arquitetura/inventario-multiunidade.md`, com PKs, FKs, unicidades, timestamps, RLS habilitada e sem permissões operacionais amplas. Não adicionar ainda colunas às 11 tabelas operacionais.

**Step 2: Resetar o banco local**

Run:

```bash
supabase db reset
```

Expected: todas as migrations aplicam sem erro.

**Step 3: Rodar o teste estrutural**

Run:

```bash
supabase test db supabase/tests/20260917_multiunit_foundation_test.sql
```

Expected: PASS.

**Step 4: Rodar checks da aplicação**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: testes e build verdes; lint sem erro novo.

**Step 5: Commit**

```bash
git add supabase/migrations/<timestamp>_multiunit_foundation.sql supabase/tests/20260917_multiunit_foundation_test.sql
git commit -m "feat: add multiunit foundation schema"
```

## Task 8: Adicionar colunas de compatibilidade sem `NOT NULL`

**Objective:** Preparar as tabelas existentes para backfill sem quebrar o aplicativo atual.

**Files:**
- Create: `supabase/migrations/<timestamp>_multiunit_compatibility_columns.sql`
- Create: `supabase/tests/20260917_multiunit_compatibility_test.sql`

**Step 1: Escrever teste de colunas ausentes**

Verificar `business_unit_id` nas 11 tabelas operacionais, `organization_id` em `categories`, `bank_account_id` em `transactions` e `created_by_user_id` onde autoria é necessária. Verificar também que todas ainda aceitam `NULL`.

**Step 2: Rodar e confirmar falha**

Run:

```bash
supabase test db supabase/tests/20260917_multiunit_compatibility_test.sql
```

Expected: FAIL antes da migration.

**Step 3: Implementar colunas aditivas e índices**

Não remover `user_id`. Não criar `NOT NULL`. Não trocar policies legadas nesta tarefa.

**Step 4: Resetar e testar**

Run:

```bash
supabase db reset
supabase test db supabase/tests/20260917_multiunit_compatibility_test.sql
```

Expected: PASS; aplicativo legado continua compilando.

**Step 5: Commit**

```bash
git add supabase/migrations/<timestamp>_multiunit_compatibility_columns.sql supabase/tests/20260917_multiunit_compatibility_test.sql
git commit -m "feat: add multiunit compatibility columns"
```

## Task 9: Especificar o backfill idempotente antes de implementá-lo

**Objective:** Provar preservação de contagens, reexecução segura e relatório de exceções.

**Files:**
- Create: `supabase/tests/20260917_multiunit_backfill_test.sql`
- Create: `supabase/fixtures/multiunit_backfill.sql`

**Step 1: Criar fixtures fictícias**

Cobrir:

- perfil completo;
- perfil sem entidade fiscal;
- conflito entre `document` e `fiscal_document`;
- banco parcial;
- relações pai/filho válidas;
- tabela pessoal que deve permanecer intocada.

**Step 2: Escrever os asserts de falha**

Verificar:

- uma organização e uma unidade padrão por perfil;
- memberships `proprietario` únicas;
- cópia correta dos 38 campos conforme matriz;
- 11 tabelas operacionais vinculadas à unidade;
- cinco tabelas pessoais sem `business_unit_id`;
- conflito fiscal em relatório, sem entidade inventada;
- segunda execução não cria duplicatas;
- contagens antes/depois preservadas.

**Step 3: Rodar e confirmar falha**

Run:

```bash
supabase db reset
supabase test db supabase/tests/20260917_multiunit_backfill_test.sql
```

Expected: FAIL porque o backfill ainda não existe.

**Step 4: Commit**

```bash
git add supabase/fixtures/multiunit_backfill.sql supabase/tests/20260917_multiunit_backfill_test.sql
git commit -m "test: specify idempotent multiunit backfill"
```

## Task 10: Implementar o backfill como migration separada

**Objective:** Migrar fixtures localmente com rastreabilidade e rollback lógico, sem alterar produção.

**Files:**
- Create: `supabase/migrations/<timestamp>_multiunit_backfill.sql`
- Test: `supabase/tests/20260917_multiunit_backfill_test.sql`

**Step 1: Implementar por perfil e por fases**

A migration deve usar chaves idempotentes, preservar colunas legadas e produzir tabela/relatório técnico de exceções sem dados sensíveis desnecessários.

**Step 2: Rodar reset e teste**

Run:

```bash
supabase db reset
supabase test db supabase/tests/20260917_multiunit_backfill_test.sql
```

Expected: PASS em primeira e segunda execução controlada do backfill.

**Step 3: Verificar regressão**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: tudo verde.

**Step 4: Commit**

```bash
git add supabase/migrations/<timestamp>_multiunit_backfill.sql supabase/tests/20260917_multiunit_backfill_test.sql
git commit -m "feat: add idempotent multiunit backfill"
```

## Task 11: Criar testes de RLS em modo de compatibilidade

**Objective:** Provar acesso legado e acesso por unidade sem abrir acesso cruzado.

**Files:**
- Create: `supabase/tests/20260917_multiunit_rls_compatibility_test.sql`
- Create: `supabase/migrations/<timestamp>_multiunit_rls_compatibility.sql`

**Step 1: Escrever os cenários que falham**

Cobrir os cenários 1–6, 14, 18, 20, 21, 24 e 25 da matriz em `docs/arquitetura/inventario-multiunidade.md`.

**Step 2: Rodar e confirmar falha**

Run:

```bash
supabase test db supabase/tests/20260917_multiunit_rls_compatibility_test.sql
```

Expected: FAIL antes das funções auxiliares e policies.

**Step 3: Implementar helpers e policies compatíveis**

Criar `is_org_member`, `has_bu_access` e `bu_role` com `SECURITY DEFINER`, `search_path` fixo e privilégios mínimos. Manter fallback legado somente durante a fase de compatibilidade.

**Step 4: Rodar testes**

Run:

```bash
supabase db reset
supabase test db supabase/tests/20260917_multiunit_rls_compatibility_test.sql
```

Expected: PASS; acesso cruzado sempre retorna zero linhas ou erro de autorização.

**Step 5: Commit**

```bash
git add supabase/migrations/<timestamp>_multiunit_rls_compatibility.sql supabase/tests/20260917_multiunit_rls_compatibility_test.sql
git commit -m "feat: add compatible multiunit RLS"
```

## Task 12: Atualizar o gerador de tipos somente após o schema local passar

**Objective:** Sincronizar TypeScript com o banco local validado.

**Files:**
- Modify: `src/integrations/supabase/types.ts`

**Step 1: Gerar tipos do banco local**

Run:

```bash
supabase gen types typescript --local > /tmp/gerirmais-types.ts
```

Expected: arquivo gerado sem erro.

**Step 2: Substituir o arquivo de tipos após revisão do diff**

Run:

```bash
cp /tmp/gerirmais-types.ts src/integrations/supabase/types.ts
git diff --check
git diff --stat
```

Expected: mudanças refletem apenas o schema aditivo aprovado.

**Step 3: Validar aplicação**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: tudo verde.

**Step 4: Commit**

```bash
git add src/integrations/supabase/types.ts
git commit -m "chore: refresh Supabase types for multiunit schema"
```

## Task 13: Produzir pacote de aprovação antes de qualquer ambiente remoto

**Objective:** Entregar ao Chefe uma decisão pequena e verificável, sem confundir prontidão local com autorização de produção.

**Files:**
- Create: `docs/arquitetura/2026-09-17-multiunit-migration-approval-gate.md`
- Read: todos os testes e migrations criados neste plano

**Step 1: Documentar evidências**

Incluir:

- hashes dos commits;
- migrations propostas;
- testes executados e resultados;
- contagens e exceções sanitizadas;
- rollback por fase;
- riscos remanescentes;
- escopo exato do primeiro ambiente permitido;
- confirmação de que produção não foi alterada.

**Step 2: Definir decisão pedida**

```markdown
Decisão recomendada: autorizar somente a aplicação das migrations aditivas em staging/cópia restaurada, seguida dos testes de contagem, isolamento e rollback. Não autoriza produção, deploy, DNS, publicação nem remoção de `user_id`.
```

**Step 3: Verificar o pacote**

Run:

```bash
git diff --check
npm test
npm run lint
npm run build
```

Expected: documentação consistente; testes/build verdes.

**Step 4: Commit**

```bash
git add docs/arquitetura/2026-09-17-multiunit-migration-approval-gate.md
git commit -m "docs: add multiunit migration approval gate"
```

---

## Gates de saída

1. **Diagnóstico:** remoto executado uma vez, somente leitura, saída sanitizada e reconciliada.
2. **Schema local:** migrations aditivas aplicam do zero e todos os testes SQL passam.
3. **Backfill local:** idempotência, contagens e exceções provadas com fixtures.
4. **RLS:** isolamento entre organizações e unidades provado no banco.
5. **Aplicação:** `npm test`, `npm run lint` e `npm run build` sem regressão nova.
6. **Humano:** staging/cópia restaurada exige aprovação explícita; produção permanece proibida até novo gate.

## Critério de conclusão deste plano

O plano está executado quando existe um pacote local versionado com diagnóstico reconciliado, migrations aditivas, testes SQL de schema/backfill/RLS, tipos atualizados, rollback documentado e pedido de aprovação limitado a staging ou cópia restaurada. Isso não significa migration de produção concluída.