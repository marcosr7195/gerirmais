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

  useEffect(() => {
    if (token && !user) localStorage.setItem(PENDING_INVITE_KEY, token);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Convite para equipe</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <>
              <p className="text-sm text-muted-foreground">Entre ou crie sua conta com o e-mail que recebeu o convite para continuar.</p>
              <Button asChild className="w-full"><Link to="/auth">Entrar ou criar conta</Link></Button>
            </>
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
