import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PENDING_INVITE_KEY = "gerir_pending_invite";

export default function Convite() {
  const { token: routeToken } = useParams();
  const token = routeToken || localStorage.getItem(PENDING_INVITE_KEY) || "";
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const [preview, setPreview] = useState<{ valid: boolean; email?: string; unit_name?: string } | null>(null);

  useEffect(() => {
    if (token && !user) localStorage.setItem(PENDING_INVITE_KEY, token);
  }, [token, user]);

  useEffect(() => {
    if (!token || user) return;
    supabase.rpc("get_invite_preview" as any, { p_token: token }).then(({ data }) => setPreview(data as any));
  }, [token, user]);

  const accept = async () => {
    setStatus("loading");
    const { data, error } = await supabase.rpc("accept_unit_invite" as any, { p_token: token });
    const res = data as { success: boolean; message?: string } | null;
    localStorage.removeItem(PENDING_INVITE_KEY);
    if (error || !res?.success) {
      setStatus("error");
      setMessage(res?.message || "Não foi possível aceitar o convite.");
      return;
    }
    await refreshProfile();
    window.location.href = "/";
  };

  const authLink = preview?.email
    ? `/auth?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(preview.email)}`
    : "/auth";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Convite para equipe</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            preview && !preview.valid ? (
              <p className="text-sm text-destructive">Este convite é inválido, já foi usado ou expirou.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {preview?.unit_name ? <>Você foi convidado para <strong className="text-foreground">{preview.unit_name}</strong>. </> : null}
                  Crie sua conta com {preview?.email ? <strong className="text-foreground">{preview.email}</strong> : "o e-mail que recebeu o convite"}. Depois de confirmar o e-mail, você entra direto na equipe.
                </p>
                <Button asChild className="w-full"><Link to={authLink}>Criar conta</Link></Button>
                <Button asChild variant="outline" className="w-full"><Link to="/auth">Já tenho conta — entrar</Link></Button>
              </>
            )
          ) : status === "error" ? (
            <>
              <p className="text-sm text-destructive">{message}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Voltar</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Você foi convidado para fazer parte de uma unidade no Gerir+.</p>
              <Button className="w-full" onClick={accept} disabled={status === "loading" || !token}>
                {status === "loading" ? "Aceitando..." : "Aceitar convite"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
