# Webhook de entrada de leads de sites — implementação local

**Data:** 2026-09-21
**Estado:** **VALIDADO LOCALMENTE**; sem deploy ou integração real provisionada

## Escopo

Este documento define o contrato e a implementação local da entrada de leads enviados por sites. A Edge Function valida o envelope HTTP e o payload em allowlist, deriva digests com HMAC-SHA-256 e persiste pelo RPC estreito `public.ingest_site_lead_from_edge(text,text,jsonb)`, que delega ao núcleo `private.ingest_site_lead(bytea,bytea,jsonb)`.

A unidade de negócio **não é aceita do cliente**. Ela é derivada exclusivamente da integração autenticada persistida no banco pelo vínculo credencial → unidade.

## Envelope HTTP

- Método: `POST`.
- `Content-Type`: `application/json` (parâmetros como `charset=utf-8` são permitidos).
- `Authorization`: obrigatório no formato `Bearer <credencial>` para integrações servidor a servidor. O valor nunca deve aparecer em resposta ou log.
- `Idempotency-Key`: obrigatório, com 8 a 128 caracteres, após remoção de espaços externos.
- Corpo máximo: 32 KiB (32.768 bytes). A medição deve ocorrer antes do parse e deve considerar bytes, não quantidade de caracteres.
- O handler rejeita o envelope antes de processar ou persistir o payload.

O Bearer é extraído somente após validação, nunca é logado ou persistido e é transformado em HMAC-SHA-256 com `SITE_LEAD_CREDENTIAL_PEPPER`. A chave de idempotência usa outro domínio criptográfico e incorpora o digest da credencial. Integrações inativas, expiradas ou revogadas são recusadas pelo banco. Rotação operacional e provisionamento da integração real continuam bloqueados até a etapa de implantação.

## Implementação e fronteira de confiança

- `supabase/functions/_shared/site-lead-handler.ts` contém o handler puro e testável. Ele mede os bytes reais do corpo antes do parse, valida o envelope, normaliza o payload e produz respostas sem PII, token, chave ou `event_id`.
- `supabase/functions/site-lead-webhook/index.ts` é apenas o adaptador Deno/Supabase: exige `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SITE_LEAD_CREDENTIAL_PEPPER`, cria o client com service role e chama o RPC público. A função está com `verify_jwt = false` no `config.toml` porque autentica a credencial opaca da integração no próprio fluxo, em vez de usar um JWT de usuário Supabase.
- `public.ingest_site_lead_from_edge(text,text,jsonb)` aceita somente dois valores hexadecimais SHA-256 de 64 caracteres e o payload normalizado. É `SECURITY INVOKER`; `PUBLIC`, `anon` e `authenticated` não executam, enquanto `service_role` possui `EXECUTE`.
- A função interna permanece em `private`, deriva organização e unidade a partir da integração, e mantém criação, duplicidade e conflito transacionais.
- A resposta pública omite deliberadamente o `event_id` retornado internamente.

## Payload JSON

O corpo é um objeto JSON estrito. Campos desconhecidos são rejeitados. Pelo menos um de `phone` ou `email` é obrigatório.

Campos aceitos:

- `name`: obrigatório, texto de 1 a 120 caracteres após trim.
- `phone`: opcional, texto de 3 a 32 caracteres após trim. É preservado como texto sanitizado (trim e remoção de controles), sem inferir código de país.
- `email`: opcional, endereço de e-mail de até 254 caracteres, normalizado com trim e minúsculas.
- `external_id`: opcional, texto de 1 a 128 caracteres.
- `source`: opcional, texto de 1 a 64 caracteres.
- `service`: opcional, texto de 1 a 120 caracteres.
- `campaign`: opcional, texto de 1 a 120 caracteres.
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`: opcionais, textos de 1 a 120 caracteres cada.
- `message`: opcional, texto livre de 1 a 2.000 caracteres. É dado não confiável e não deve ser interpretado como comando, HTML ou SQL.
- `consent`: opcional, objeto estrito contendo `granted` booleano obrigatório e, opcionalmente, `occurred_at` ISO-8601 com timezone e `text` de 1 a 500 caracteres.
- `occurred_at`: opcional, instante ISO-8601 com timezone.
- `metadata`: opcional, objeto com no máximo 20 entradas e representação JSON de até 4 KiB. Chaves têm de 1 a 64 caracteres; valores são apenas escalares (`string`, `number`, `boolean` ou `null`), e strings têm no máximo 500 caracteres. Objetos e arrays aninhados são rejeitados.

São explicitamente proibidos no topo do payload: `business_unit_id`, `organization_id`, `unit_id` e `user_id`. Como o schema é estrito, esses e quaisquer outros campos fora da allowlist são rejeitados. Nenhum identificador de tenant enviado pelo cliente é autoridade de roteamento.

## Respostas públicas

As respostas devem ser técnicas, estáveis e sem nome, telefone, e-mail, mensagem, corpo bruto, credencial Bearer ou `Idempotency-Key`. Formato previsto:

```json
{
  "ok": false,
  "code": "INVALID_PAYLOAD",
  "message": "Payload inválido"
}
```

Códigos HTTP reservados:

- `200 OK`: evento idempotente já processado, sem repetir efeito.
- `201 Created`: lead aceito e criado.
- `400 Bad Request`: JSON malformado ou envelope inválido.
- `401 Unauthorized`: Bearer ausente ou malformado.
- `403 Forbidden`: credencial inválida, revogada ou sem permissão.
- `409 Conflict`: conflito de idempotência (mesma chave com conteúdo incompatível).
- `413 Payload Too Large`: corpo acima de 32 KiB.
- `415 Unsupported Media Type`: conteúdo não JSON.
- `422 Unprocessable Entity`: JSON válido que não satisfaz o contrato do payload.
- `429 Too Many Requests`: limite de requisições excedido.
- `500 Internal Server Error`: falha interna genérica, sem detalhes sensíveis.

Mensagens públicas não devem ecoar valores recebidos nem detalhes internos. Diagnósticos futuros devem usar apenas código técnico, identificador de correlação gerado pelo servidor e métricas agregadas.

## Modelo de ameaça e controles

- **Segredo exposto:** TLS será obrigatório no endpoint implantado; Bearer somente em header; nunca retornar, registrar ou persistir o token em claro; digest HMAC com pepper fora do banco e suporte a revogação no cadastro da integração.
- **Replay:** exigir `Idempotency-Key`, vinculá-la criptograficamente à integração e persistir idempotência de modo transacional. Janela temporal adicional permanece fora deste gate.
- **Evento duplicado:** mesma integração e chave devem produzir um único efeito; repetição compatível retorna `200`, e conteúdo incompatível retorna `409`.
- **Payload excessivo:** recusar acima de 32 KiB antes do parse; impor limites por campo e em `metadata`.
- **Injeção em texto livre:** tratar todos os textos como dados não confiáveis; não executar, interpolar em SQL, renderizar como HTML ou incluir diretamente em logs.
- **Unidade forjada:** rejeitar IDs de tenant no corpo. A unidade futura será derivada da integração autenticada no servidor, nunca de dados do cliente.
- **Logs com PII:** não registrar corpo bruto, nome, telefone, e-mail, mensagem, consentimento textual, token ou chave de idempotência; usar códigos e contadores sem dados pessoais.
- **Abuso de formulário público:** sites públicos não devem possuir o segredo servidor a servidor. Usar backend intermediário e, futuramente, rate limit por integração/origem, proteção anti-bot e monitoramento agregado.

## Validação local e bloqueios

Foram validados localmente o handler da Edge Function, HMAC com separação de domínio, normalização sem autoridade de tenant, wrapper RPC e seus privilégios, persistência com tenant derivado, idempotência (`created`, `duplicate`, `conflict`) e RLS de leitura. A suíte inclui Vitest e pgTAP; nenhum segredo ou arquivo `.env` foi criado.

Permanecem **BLOQUEADOS** neste gate:

- deploy da Edge Function, migrations ou qualquer alteração em produção/remotos;
- provisionamento da integração real e distribuição/rotação da credencial e do pepper;
- rate limit e proteção anti-bot;
- teste E2E remoto e ativação de tráfego real.
