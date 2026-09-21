# Contrato do webhook de entrada de leads de sites (W0)

**Data:** 2026-09-21
**Estado:** contrato local; sem endpoint, persistência ou autenticação real

## Escopo

Este documento define a primeira fatia, puramente local, do contrato de entrada de leads enviados por sites. O W0 valida o envelope HTTP e um payload em allowlist; não cria endpoint, não acessa banco e não registra o corpo recebido.

A futura unidade de negócio **não será aceita do cliente**. Ela será derivada exclusivamente da integração autenticada, depois que o schema multiunidade e o vínculo credencial → unidade forem aprovados.

## Envelope HTTP

- Método: `POST`.
- `Content-Type`: `application/json` (parâmetros como `charset=utf-8` são permitidos).
- `Authorization`: obrigatório no formato `Bearer <credencial>` para integrações servidor a servidor. O valor nunca deve aparecer em resposta ou log.
- `Idempotency-Key`: obrigatório, com 8 a 128 caracteres, após remoção de espaços externos.
- Corpo máximo: 32 KiB (32.768 bytes). A medição deve ocorrer antes do parse e deve considerar bytes, não quantidade de caracteres.
- O endpoint futuro deve rejeitar o envelope antes de processar ou persistir o payload.

O W0 apenas reconhece a presença e o formato do Bearer; autenticação, armazenamento seguro/verificação da credencial, rotação e revogação ficam para uma etapa posterior.

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

- **Segredo exposto:** TLS obrigatório no endpoint futuro; Bearer somente em header; nunca retornar, registrar ou persistir o token em claro; prever hash, rotação e revogação.
- **Replay:** exigir `Idempotency-Key`; no futuro, combinar janela temporal, vínculo da chave à integração e persistência transacional.
- **Evento duplicado:** mesma integração e chave devem produzir um único efeito; repetição compatível retorna `200`, e conteúdo incompatível retorna `409`.
- **Payload excessivo:** recusar acima de 32 KiB antes do parse; impor limites por campo e em `metadata`.
- **Injeção em texto livre:** tratar todos os textos como dados não confiáveis; não executar, interpolar em SQL, renderizar como HTML ou incluir diretamente em logs.
- **Unidade forjada:** rejeitar IDs de tenant no corpo. A unidade futura será derivada da integração autenticada no servidor, nunca de dados do cliente.
- **Logs com PII:** não registrar corpo bruto, nome, telefone, e-mail, mensagem, consentimento textual, token ou chave de idempotência; usar códigos e contadores sem dados pessoais.
- **Abuso de formulário público:** sites públicos não devem possuir o segredo servidor a servidor. Usar backend intermediário e, futuramente, rate limit por integração/origem, proteção anti-bot e monitoramento agregado.

## Fora do W0 e próximo gate

Permanecem bloqueados: persistência, migration, autenticação real, hash/HMAC da credencial, rate limit, RLS, integração → unidade, idempotência transacional, endpoint, deploy e teste E2E. O próximo gate é concluir o diagnóstico agregado, congelar nomes canônicos e criar testes locais do schema multiunidade e das estruturas de integração.
