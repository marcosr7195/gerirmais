# Cadastro com confirmação de e-mail

## Situação atual (verificado)
- O cadastro chama `signUp` sem `emailRedirectTo`: o link de confirmação pode levar para um endereço errado (preview em vez de app.gerirmais.com.br).
- Após "Criar conta" só aparece um aviso rápido; não há tela de espera nem reenvio.
- Não há domínio de e-mail próprio: os e-mails de confirmação saem pelo remetente padrão (podem cair no spam). Opcional: configurar domínio gerirmais.com.br para e-mails com a marca Gerir+.

## O que será feito
1. **Garantir confirmação obrigatória**: confirmar que a confirmação automática de e-mail está desligada (ninguém entra sem confirmar) e passar `emailRedirectTo: window.location.origin` no cadastro.
2. **Tela "Verifique seu e-mail"** (em Auth.tsx), exibida após criar conta:
   "Verifique seu email! Enviamos um link de confirmação para [email]. Clique no link para ativar sua conta."
   Botões: "Reenviar email" e "Voltar para o login".
3. **Reenvio com espera de 60s**: `supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo } })`; botão desabilitado com contagem regressiva ("Reenviar em 45s"). Também no login: se o erro for "Email not confirmed", abrir a mesma tela.
4. **Convites**:
   - A página do convite passa a abrir o cadastro já com o e-mail do convite preenchido (buscado pelo token) e travado, evitando conta com e-mail diferente.
   - O token fica guardado no navegador; o link de confirmação volta para `/convite/:token`, e só depois de confirmado e logado o convite é aceito e a pessoa é vinculada à unidade.
   - Nova função no banco `get_invite_preview(token)` (retorna só e-mail mascarado/completo do convidado e nome da unidade, se válido e não expirado).

## Fora do escopo
- E-mails com a marca Gerir+ (exige domínio de e-mail; posso fazer em seguida).
- Convite enviado automaticamente por e-mail (segue copiar link/mailto).

## Detalhes técnicos
- Arquivos: `src/pages/Auth.tsx`, `src/pages/Convite.tsx`, migration com `get_invite_preview` (SECURITY DEFINER, search_path fixo, grant a anon/authenticated).
- `configure_auth`: auto_confirm_email=false, signup habilitado, HIBP ligado.
- Teste: cadastro no preview → tela de verificação → reenvio bloqueado por 60s; login sem confirmar → tela de verificação.
