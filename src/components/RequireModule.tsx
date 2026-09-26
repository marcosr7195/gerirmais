import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { canSeeModule, ModuleKey } from "@/lib/permissions";

export function RequireModule({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { unitRole } = useAuth();
  if (!unitRole) return <div className="animate-pulse text-muted-foreground">Carregando...</div>;
  if (!canSeeModule(unitRole, module)) {
    if (module === "dashboard" && unitRole === "collaborator") return <Navigate to="/vendas" replace />;
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">Você não tem permissão para acessar esta área</p>
      </div>
    );
  }
  return <>{children}</>;
}
