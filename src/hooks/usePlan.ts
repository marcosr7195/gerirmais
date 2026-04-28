import { useAuth } from "@/contexts/AuthContext";

export type PlanTier = "starter" | "pro" | "scale";
export type SubStatus = "trial" | "ativo" | "inativo" | "atrasado";

export type FeatureKey =
  | "financas"
  | "vendas"
  | "operacao"
  | "dashboard"
  | "proposta_pdf"
  | "historico_cliente"
  | "marketing"
  | "valor"
  | "multi_user"
  | "whatsapp";

const PLAN_RANK: Record<PlanTier, number> = { starter: 1, pro: 2, scale: 3 };

const FEATURE_MIN_PLAN: Record<FeatureKey, PlanTier> = {
  financas: "starter",
  vendas: "starter",
  operacao: "starter",
  dashboard: "starter",
  proposta_pdf: "pro",
  historico_cliente: "pro",
  marketing: "pro",
  valor: "pro",
  multi_user: "scale",
  whatsapp: "scale",
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  financas: "Finanças",
  vendas: "Vendas",
  operacao: "Operação",
  dashboard: "Dashboard",
  proposta_pdf: "Proposta em PDF",
  historico_cliente: "Histórico do cliente",
  marketing: "Marketing",
  valor: "Valor",
  multi_user: "Múltiplos usuários",
  whatsapp: "WhatsApp",
};

export interface PlanState {
  plan: PlanTier;
  status: SubStatus;
  isTrial: boolean;
  isActive: boolean; // tem acesso ao sistema
  trialDaysLeft: number;
  daysUntilExpire: number;
  expiresAt: Date | null;
  hasFeature: (f: FeatureKey) => boolean;
  requiredPlan: (f: FeatureKey) => PlanTier;
}

export function usePlan(): PlanState {
  const { profile } = useAuth();

  const plan = ((profile as any)?.plano ?? "pro") as PlanTier;
  const status = ((profile as any)?.status_assinatura ?? "trial") as SubStatus;
  const expiresAtStr = (profile as any)?.data_vencimento as string | null;
  const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

  const now = Date.now();
  const msLeft = expiresAt ? expiresAt.getTime() - now : 0;
  const daysUntilExpire = Math.ceil(msLeft / 86400000);
  const isTrial = status === "trial";
  const trialDaysLeft = isTrial ? Math.max(0, daysUntilExpire) : 0;

  // Active = trial não expirou, ou ativo, ou atrasado dentro de 3 dias de tolerância
  let isActive = false;
  if (status === "ativo") isActive = true;
  else if (status === "trial") isActive = msLeft > 0;
  else if (status === "atrasado") isActive = msLeft > -3 * 86400000;
  else isActive = false;

  // Plano efetivo: durante trial, libera tudo (pro). Inativo => starter (mas isActive=false bloqueia)
  const effectivePlan: PlanTier = isTrial ? "pro" : plan;

  const hasFeature = (f: FeatureKey) => {
    if (!isActive) return false;
    return PLAN_RANK[effectivePlan] >= PLAN_RANK[FEATURE_MIN_PLAN[f]];
  };

  return {
    plan: effectivePlan,
    status,
    isTrial,
    isActive,
    trialDaysLeft,
    daysUntilExpire,
    expiresAt,
    hasFeature,
    requiredPlan: (f) => FEATURE_MIN_PLAN[f],
  };
}
