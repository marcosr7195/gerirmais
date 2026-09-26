import type { UnitRole } from "@/contexts/AuthContext";

export type ModuleKey =
  | "dashboard"
  | "vitrine"
  | "marketing"
  | "vendas"
  | "entregas"
  | "financas"
  | "configuracoes"
  | "pessoal";

export const ROLE_LABELS: Record<UnitRole, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  collaborator: "Colaborador",
  viewer: "Visualizador",
};

const COLLABORATOR_MODULES: ModuleKey[] = ["vendas", "entregas", "pessoal"];

export function canSeeModule(role: UnitRole | null, module: ModuleKey) {
  if (!role) return false;
  if (role === "collaborator") return COLLABORATOR_MODULES.includes(module);
  return true;
}

export const canWrite = (role: UnitRole | null) => role === "owner" || role === "manager" || role === "collaborator";
export const canDelete = (role: UnitRole | null) => role === "owner";
export const canManageTeam = (role: UnitRole | null) => role === "owner";
export const canSeeFinancialSettings = (role: UnitRole | null) => role === "owner";

export const ROUTE_MODULES: Record<string, ModuleKey> = {
  "/": "dashboard",
  "/vitrine": "vitrine",
  "/marketing": "marketing",
  "/vendas": "vendas",
  "/entregas": "entregas",
  "/financas": "financas",
  "/configuracoes": "configuracoes",
};
