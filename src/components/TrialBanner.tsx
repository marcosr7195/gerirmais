import { Link } from "react-router-dom";
import { Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/usePlan";

export function TrialBanner() {
  const { isTrial, trialDaysLeft, status, isActive } = usePlan();

  if (status === "atrasado") {
    return (
      <div className="bg-warning/15 border-b border-warning/30 px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span className="truncate">
            Seu pagamento não foi reconhecido. Acesso liberado por mais alguns dias — regularize para evitar bloqueio.
          </span>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/planos">Ver planos</Link>
        </Button>
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="bg-destructive/15 border-b border-destructive/30 px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="truncate">
            Seu acesso está inativo. Escolha um plano para reativar o Gerir+.
          </span>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/planos">Ver planos</Link>
        </Button>
      </div>
    );
  }

  if (!isTrial) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate">
          Você está no período gratuito — <strong>{trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}</strong>. Escolha seu plano para continuar.
        </span>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to="/planos">Ver planos</Link>
      </Button>
    </div>
  );
}
