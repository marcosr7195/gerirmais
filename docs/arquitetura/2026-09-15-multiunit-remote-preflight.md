# Gerir+ — preflight remoto multiunidade

## Status

**FEITO NÃO TESTADO em 15/09/2026.** A consulta somente leitura foi criada e passou por validação estática local. Não foi executada contra PostgreSQL/Supabase porque `supabase` e `psql` não estão instalados neste ambiente e nenhuma credencial de banco foi usada.

## Objetivo

Comparar o estado efetivo do Supabase com as 20 migrations locais antes de escrever qualquer migration multiunidade.

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

Alternativa: executar no SQL Editor do Supabase após revisão humana, preservando a transação `READ ONLY`.

## Critérios de aceite

- [x] arquivo de diagnóstico existe;
- [x] escopo limitado a metadados e contagens;
- [x] validação estática não encontrou verbos destrutivos/executáveis;
- [ ] SQL aceito pelo PostgreSQL do ambiente-alvo;
- [ ] resultado remoto capturado e sanitizado;
- [ ] migrations locais e remotas reconciliadas;
- [ ] órfãos e divergências classificados;
- [ ] evidência vinculada à tarefa operacional.

## Aprovação e limites

Preparar e revisar o diagnóstico não exige decisão comercial. A execução remota deve respeitar o acesso disponível e não autoriza migration, alteração de dado, deploy ou produção.

## Próxima ação

Executar o diagnóstico uma única vez em ambiente seguro quando houver cliente/acesso técnico validado. Depois, fechar a matriz de decomposição de `profiles` e transformar o plano em migrations TDD pequenas.