import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import logoCompletaAsset from "@/assets/logo-gerirmais-oficial.png.asset.json";

const COOLDOWN = 60;

export default function Auth() {
  const [params] = useSearchParams();
  const inviteToken = params.get("invite");
  const inviteEmail = params.get("email");
  const [isLogin, setIsLogin] = useState(!inviteEmail);
  const [email, setEmail] = useState(inviteEmail || "");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const redirectTo = inviteToken
    ? `${window.location.origin}/convite/${inviteToken}`
    : window.location.origin;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const showPending = (addr: string) => {
    setPendingEmail(addr);
    setCooldown(COOLDOWN);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !acceptedTerms) {
      toast.error("Você precisa aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/not confirmed/i.test(error.message)) {
            setPendingEmail(email);
            return;
          }
          throw error;
        }
        toast.success("Login realizado com sucesso!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        if (data.session) return; // conta já ativa
        showPending(email);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!pendingEmail || cooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) return toast.error("Não foi possível reenviar agora. Tente novamente em instantes.");
    toast.success("Email reenviado!");
    setCooldown(COOLDOWN);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <img src={logoCompletaAsset.url} alt="Gerir+" className="h-14 sm:h-16 w-auto object-contain" />
          </div>
          {!pendingEmail && (
            <p className="text-muted-foreground text-sm">
              {isLogin ? "Entre na sua conta" : "Crie sua conta gratuita"}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {pendingEmail ? (
            <div className="space-y-4 text-center">
              <MailCheck className="mx-auto h-12 w-12 text-primary" />
              <h2 className="text-xl font-semibold">Verifique seu email!</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de confirmação para <strong className="text-foreground">{pendingEmail}</strong>.
                Clique no link para ativar sua conta.
              </p>
              <Button className="w-full" onClick={resend} disabled={loading || cooldown > 0}>
                {cooldown > 0 ? `Reenviar email em ${cooldown}s` : "Reenviar email"}
              </Button>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => { setPendingEmail(null); setIsLogin(true); setPassword(""); }}
              >
                Voltar para o login
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={!!inviteEmail}
                  required
                />
                <Input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {!isLogin && (
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptedTerms}
                      onCheckedChange={(c) => setAcceptedTerms(c === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                      Li e aceito os{" "}
                      <Link to="/termos" target="_blank" className="text-primary hover:underline">Termos de Uso</Link>{" "}
                      e a{" "}
                      <Link to="/privacidade" target="_blank" className="text-primary hover:underline">Política de Privacidade</Link>.
                    </label>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading || (!isLogin && !acceptedTerms)}>
                  {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setAcceptedTerms(false); }}
                  className="text-sm text-primary hover:underline"
                >
                  {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
