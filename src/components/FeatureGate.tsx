import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePlan, FeatureKey, FEATURE_LABELS } from "@/hooks/usePlan";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  /** Mostrar bloqueio inline (card) ao invés de esconder */
  fallback?: "card" | "hidden";
}

const PLAN_LABEL: Record<string, string> = { starter: "Starter", pro: "Pro", scale: "Scale" };

export function FeatureGate({ feature, children, fallback = "card" }: FeatureGateProps) {
  const { hasFeature, requiredPlan } = usePlan();
  if (hasFeature(feature)) return <>{children}</>;
  if (fallback === "hidden") return null;

  const required = requiredPlan(feature);
  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-semibold">{FEATURE_LABELS[feature]}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Esta funcionalidade está disponível no plano {PLAN_LABEL[required]} — clique abaixo para fazer upgrade
          </p>
        </div>
        <Button asChild>
          <Link to="/planos">Ver planos</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface FeatureLockButtonProps {
  feature: FeatureKey;
  children: ReactNode;
  /** Renderiza o children passando uma flag locked + onClick que redireciona */
  render: (args: { locked: boolean; onLockedClick: () => void }) => ReactNode;
}

export function FeatureLock({ feature, render }: Omit<FeatureLockButtonProps, "children">) {
  const { hasFeature } = usePlan();
  const locked = !hasFeature(feature);
  const onLockedClick = () => {
    window.location.href = "/planos";
  };
  return <>{render({ locked, onLockedClick })}</>;
}
