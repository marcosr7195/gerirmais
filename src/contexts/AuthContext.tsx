import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  business_name: string | null;
  service_type: string | null;
  document: string | null;
  onboarding_completed: boolean | null;
  slogan: string | null;
  owner_name: string | null;
  owner_role: string | null;
  fiscal_type: string | null;
  fiscal_document: string | null;
  company_name: string | null;
  whatsapp: string | null;
  commercial_email: string | null;
  website: string | null;
  instagram: string | null;
  zip_code: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  bank_name: string | null;
  account_type: string | null;
  agency: string | null;
  account_number: string | null;
  pix_key: string | null;
  account_holder: string | null;
  logo_url: string | null;
  plano: "starter" | "pro" | "scale" | null;
  status_assinatura: "trial" | "ativo" | "inativo" | "atrasado" | null;
  data_inicio: string | null;
  data_vencimento: string | null;
  origem: string | null;
  slug: string | null;
  active_unit_id: string | null;
}

export type UnitRole = "owner" | "manager" | "collaborator" | "viewer";
export interface UnitPlan { plano: string; status_assinatura: string; data_vencimento: string | null }

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  unitRole: UnitRole | null;
  unitPlan: UnitPlan | null;
  inviteNotice: { unit_name: string; role: UnitRole } | null;
  inviteExpired: boolean;
  clearInviteNotice: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unitRole, setUnitRole] = useState<UnitRole | null>(null);
  const [unitPlan, setUnitPlan] = useState<UnitPlan | null>(null);
  const [inviteNotice, setInviteNotice] = useState<{ unit_name: string; role: UnitRole } | null>(null);
  const [inviteExpired, setInviteExpired] = useState(false);

  const fetchProfile = async (userId: string) => {
    let { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data && (!data.onboarding_completed || !data.active_unit_id)) {
      const { data: res } = await supabase.rpc("accept_my_pending_invite" as any);
      const r = res as { accepted?: boolean; expired?: boolean; unit_name?: string; role?: string } | null;
      if (r?.accepted) {
        setInviteNotice({ unit_name: r.unit_name || "", role: (r.role || "collaborator") as UnitRole });
        const again = await supabase.from("profiles").select("*").eq("user_id", userId).single();
        data = again.data;
      } else if (r?.expired) {
        setInviteExpired(true);
      }
    }
    setProfile(data as Profile | null);
    const [{ data: role }, { data: plan }] = await Promise.all([
      supabase.rpc("current_unit_role" as any),
      supabase.rpc("current_unit_plan" as any),
    ]);
    setUnitRole(((role as string) || "owner") as UnitRole);
    setUnitPlan((plan as UnitPlan) || null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setUnitRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, unitRole, unitPlan, inviteNotice, inviteExpired, clearInviteNotice: () => setInviteNotice(null), signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
