# Gerir+ — preflight remoto multiunidade

## Status

**VERIFICADO em 18/09/2026.** A consulta somente leitura passou pela validação estática local e foi executada manualmente no SQL Editor do Lovable Cloud. A saída consolidada foi capturada, sanitizada e reconciliada sem executar DDL, DML, migration ou alteração de produção.

## Objetivo

Comparar o estado efetivo do Supabase com as 20 migrations locais antes de escrever qualquer migration multiunidade.

## Baseline da execução

- Branch: `planning/multiunit-preflight-20260915`
- Commit local: `cf26f89fc6661e84dfb7c876c39801a21317117d`
- Referência remota: `98c218dba6c8743091f25d5fcaeb14976513a764`
- Executado em UTC: `2026-09-18T12:05:28Z`
- Estado do working tree: sem mudança rastreada antes desta atualização; três artefatos Lovable preexistentes permanecem não rastreados e fora do escopo.

## Artefato

`supabase/diagnostics/20260915_multiunit_preflight_readonly.sql`

## Escopo da consulta

A consulta retorna somente metadados e agregados:

1. migrations aplicadas;
2. tabelas e estado do RLS;
3. colunas e nulabilidade;
4. PKs, FKs e unicidades;
5. índices;
6. policies de `public` e `storage`;
7. metadados de funções e `SECURITY DEFINER`;
8. triggers ativos;
9. configuração de buckets, sem objetos;
10. contagens por tabela;
11. totais de `user_id` nulos/órfãos;
12. contagens de divergências de tenant entre pais e filhos;
13. distribuição agregada por proprietário sem retornar UUIDs.

A consulta não seleciona nomes, e-mails, telefones, documentos, conteúdo financeiro, URLs de arquivos ou outros registros de clientes.

## Garantias locais

- inicia com `BEGIN TRANSACTION READ ONLY`;
- usa `statement_timeout` de 60 segundos;
- não contém `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `TRUNCATE`, `CREATE`, `ALTER`, `DROP`, `GRANT`, `REVOKE`, `CALL`, `COPY` ou `DO` executáveis;
- termina com `COMMIT`;
- o teste estático ignora comentários e literais antes de procurar verbos proibidos.

## Como executar com segurança

1. Revisar o SQL integralmente.
2. Escolher primeiro ambiente local, staging ou cópia restaurada.
3. Confirmar usuário com permissão somente leitura quando disponível.
4. Executar o arquivo como uma única transação.
5. Exportar apenas os resultados agregados necessários.
6. Sanitizar identificadores técnicos que não precisem ir ao Notion.
7. Comparar migrations aplicadas com o commit `24f7699`.
8. Registrar divergências sem corrigi-las nesta execução.

## Comando previsto

Quando `psql` estiver disponível e a URL segura vier do ambiente, sem imprimi-la:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/diagnostics/20260915_multiunit_preflight_readonly.sql
```

Alternativa efetivamente utilizada: SQL Editor do Lovable Cloud, após revisão humana, preservando a transação `READ ONLY`.

## Critérios de aceite

- [x] arquivo de diagnóstico existe;
- [x] escopo limitado a metadados e contagens;
- [x] validação estática não encontrou verbos destrutivos/executáveis;
- [x] SQL aceito pelo PostgreSQL do ambiente-alvo;
- [x] resultado remoto capturado e sanitizado;
- [x] migrations locais e remotas reconciliadas;
- [x] órfãos e divergências classificados;
- [x] evidência vinculada à tarefa operacional.

## Aprovação e limites

Preparar e revisar o diagnóstico não exige decisão comercial. A execução remota deve respeitar o acesso disponível e não autoriza migration, alteração de dado, deploy ou produção.

## Próxima ação

Executar a consulta complementar somente leitura descrita em `docs/arquitetura/2026-09-17-remote-schema-reconciliation.md` para quantificar exceções de `profiles`, propostas, categorias e tabelas pessoais. Depois, fechar nomes canônicos e solicitar autorização específica para criar apenas os testes locais da fundação. Nenhuma migration está autorizada.