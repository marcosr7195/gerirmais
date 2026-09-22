# Site Lead Webhook W0 Implementation Plan

> **STATUS: SUPERSEDED em 2026-09-21.** Este documento preserva o gate inicial sem persistência. O gate seguinte implementou localmente a Edge Function, HMAC, persistência transacional, idempotência e RLS em `20260921120000_multiunit_foundation_and_site_lead_inbox.sql`. Deploy, migration remota, credenciais reais, rate limit e tráfego real continuam bloqueados.

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Preparar e testar localmente o contrato seguro do webhook de entrada de leads de sites, sem banco, migration, deploy ou produção.

**Architecture:** A primeira fatia será um módulo TypeScript puro, compartilhável pela futura Edge Function. Ele valida o envelope HTTP e o payload por allowlist, rejeita roteamento de tenant vindo do cliente, normaliza campos sem registrar PII e define respostas estáveis. A persistência e o vínculo credencial → unidade ficam atrás do gate do schema multiunidade.

**Tech Stack:** TypeScript 5, Zod 3, Vitest 3, Supabase Edge Functions como destino futuro.

---

## Limites

- Não criar ou aplicar migration.
- Não alterar `supabase/config.toml`.
- Não criar endpoint remoto nem fazer deploy.
- Não usar `user_id`, `organization_id`, `business_unit_id` ou `unit_id` do payload como autoridade.
- Não guardar ou registrar nome, telefone, e-mail, mensagem, token ou corpo bruto.
- Não reutilizar o `kiwify-webhook` como base de segurança.
- Não tocar nos arquivos não rastreados que já estavam no repositório.

### Task 1: Especificar o contrato público do webhook

**Objective:** Registrar payload, cabeçalhos, respostas e ameaças sem fixar o schema de persistência.

**Files:**
- Create: `docs/arquitetura/2026-09-21-site-lead-webhook-contract.md`

**Step 1: Documentar o contrato mínimo**

Definir:

- método `POST`;
- `Content-Type: application/json`;
- `Authorization: Bearer <segredo>` para integrações servidor a servidor;
- `Idempotency-Key` obrigatório;
- tamanho máximo de 32 KiB;
- pelo menos telefone ou e-mail;
- `external_id`, origem, serviço, campanha, UTMs, consentimento, instante e metadados limitados;
- rejeição explícita de identificadores de tenant no corpo;
- códigos `200`, `201`, `400`, `401`, `403`, `409`, `413`, `415`, `422`, `429`, `500`.

**Step 2: Documentar o modelo de ameaça**

Cobrir segredo exposto, replay, evento duplicado, payload excessivo, injeção em texto livre, unidade forjada, logs com PII e abuso de formulário público.

**Step 3: Verificar o documento**

Run: `git diff --check -- docs/arquitetura/2026-09-21-site-lead-webhook-contract.md`

Expected: sem erro e com declaração explícita de que a unidade futura será derivada da integração autenticada.

### Task 2: Escrever os testes do parser antes da implementação

**Objective:** Definir por testes os dados aceitos, normalizações e rejeições.

**Files:**
- Create: `src/test/site-lead-contract.test.ts`
- Create later: `supabase/functions/_shared/site-lead-contract.ts`

**Step 1: Escrever testes que importam o módulo ainda inexistente**

Cobrir:

1. aceita nome + telefone;
2. aceita nome + e-mail;
3. rejeita ausência simultânea de telefone e e-mail;
4. rejeita `business_unit_id`, `organization_id`, `unit_id` ou `user_id` em qualquer nível superior;
5. rejeita strings acima dos limites;
6. normaliza e-mail para minúsculas e espaços externos;
7. preserva telefone somente como texto sanitizado, sem assumir país;
8. limita `metadata` a chaves/valores escalares e tamanho total;
9. valida consentimento e datas ISO-8601;
10. rejeita campos desconhecidos.

**Step 2: Rodar e provar RED**

Run: `npm test -- src/test/site-lead-contract.test.ts`

Expected: FAIL porque `site-lead-contract.ts` ainda não existe.

### Task 3: Implementar o parser mínimo

**Objective:** Fazer os testes passarem com um módulo puro e sem efeitos colaterais.

**Files:**
- Create: `supabase/functions/_shared/site-lead-contract.ts`
- Test: `src/test/site-lead-contract.test.ts`

**Step 1: Criar schemas Zod estritos**

Exportar:

- `siteLeadPayloadSchema`;
- `parseSiteLeadPayload(input: unknown)`;
- tipos inferidos do payload.

Usar allowlist e `.strict()`. Não incluir IDs de tenant.

**Step 2: Rodar e provar GREEN**

Run: `npm test -- src/test/site-lead-contract.test.ts`

Expected: PASS.

**Step 3: Rodar a suíte completa**

Run: `npm test`

Expected: todos os testes aprovados.

### Task 4: Especificar e implementar validação do envelope HTTP

**Objective:** Preparar regras puras para método, tipo de conteúdo, tamanho e idempotência.

**Files:**
- Modify: `src/test/site-lead-contract.test.ts`
- Modify: `supabase/functions/_shared/site-lead-contract.ts`

**Step 1: Escrever testes que falham**

Cobrir:

- somente `POST`;
- somente JSON;
- limite de 32 KiB;
- `Idempotency-Key` obrigatório, entre 8 e 128 caracteres;
- Bearer obrigatório, sem retornar ou registrar seu valor;
- resposta técnica estável sem PII.

**Step 2: Rodar e provar RED**

Run: `npm test -- src/test/site-lead-contract.test.ts`

Expected: FAIL nas funções ainda inexistentes.

**Step 3: Implementar funções puras**

Exportar `validateSiteLeadRequestMeta` e tipos de resultado. Não implementar criptografia, acesso ao banco ou logs.

**Step 4: Rodar e provar GREEN**

Run: `npm test -- src/test/site-lead-contract.test.ts && npm test`

Expected: tudo aprovado.

### Task 5: Verificar qualidade e registrar o próximo gate

**Objective:** Provar a fatia local e deixar explícito o que ainda falta.

**Files:**
- Modify: `docs/arquitetura/2026-09-21-site-lead-webhook-contract.md`

**Step 1: Rodar verificações**

Run:

```bash
npm test
npx eslint src/test/site-lead-contract.test.ts supabase/functions/_shared/site-lead-contract.ts
git diff --check
```

Expected: testes verdes; arquivos novos sem erro de lint; diff limpo.

**Step 2: Registrar status real**

Marcar:

- `VALIDADO LOCALMENTE`: contrato e parser.
- `BLOQUEADO`: persistência, autenticação real, HMAC/Bearer hash, rate limit, RLS, integração → unidade, idempotência transacional, deploy e E2E.
- Próximo gate: executar o diagnóstico agregado, congelar nomes canônicos e criar os testes locais do schema multiunidade e das estruturas de integração.

**Step 3: Commit local**

```bash
git add docs/plans/2026-09-21-site-lead-webhook-w0.md docs/arquitetura/2026-09-21-site-lead-webhook-contract.md src/test/site-lead-contract.test.ts supabase/functions/_shared/site-lead-contract.ts
git commit -m "feat: validate site lead webhook contract"
```

Não fazer push.
