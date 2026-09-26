# Corrigir e-mails de verificação que não chegam

## Diagnóstico (confirmado nos registros)
- Os cadastros funcionam e o sistema tenta enviar o e-mail de confirmação (cadastro de ideiapaper@gmail.com às 19:10 e reenvio às 19:11).
- Todas as tentativas de envio falham com o erro "a chave de envio do projeto não está registrada". Por isso nenhum e-mail sai, nem pelo remetente padrão.
- Não é problema de código nem de modelo de e-mail: o envio é recusado antes de sair.

## O que será feito
1. Verificar o status do domínio de e-mail (notify.app.gerirmais.com.br): registros DNS e envio.
2. Gerar novamente a chave interna de envio de e-mails do projeto (é ela que está sem registro).
3. Publicar de novo a função de e-mails de autenticação para usar a chave nova.
4. Testar: reenviar a confirmação para uma conta pendente e checar nos registros que o envio ficou com status "enviado".
5. Se o domínio ainda não estiver verificado, informar quanto falta e confirmar que, até lá, o remetente padrão está enviando.

## Detalhes técnicos
- Erro: `403 lovable_api_key_not_registered` no `auth-email-hook`.
- Ações: `email_domain--check_email_domain_status`, `lovable_api_key--rotate_lovable_api_key`, `supabase--deploy_edge_functions(["auth-email-hook"])`, depois `email_domain--list_email_logs` e logs da função.
