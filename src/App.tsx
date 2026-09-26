import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Inicio from "./pages/Inicio";
import Financas from "./pages/Financas";
import FinancasPessoal from "./pages/FinancasPessoal";
import CartoesCredito from "./pages/CartoesCredito";
import Vendas from "./pages/Vendas";
import Entregas from "./pages/Entregas";
import Vitrine from "./pages/Vitrine";
import Marketing from "./pages/Marketing";
import VitrinePublica from "./pages/VitrinePublica";
import Configuracoes from "./pages/Configuracoes";
import Planos from "./pages/Planos";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import Convite, { PENDING_INVITE_KEY } from "./pages/Convite";
import { RequireModule } from "@/components/RequireModule";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading, inviteNotice, clearInviteNotice } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!inviteNotice) return;
    const label = { owner: "Proprietário", manager: "Gerente", collaborator: "Colaborador", viewer: "Visualizador" }[inviteNotice.role];
    toast.success(`Você entrou na equipe de ${inviteNotice.unit_name} como ${label}.`);
    localStorage.removeItem(PENDING_INVITE_KEY);
    navigate(inviteNotice.role === "collaborator" ? "/vendas" : "/", { replace: true });
    clearInviteNotice();
  }, [inviteNotice]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-semibold">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/vitrine/:slug" element={<VitrinePublica />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/convite/:token" element={<Convite />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }
  if (window.location.pathname.startsWith("/convite/") || localStorage.getItem(PENDING_INVITE_KEY)) {
    return (
      <Routes>
        <Route path="/convite/:token" element={<Convite />} />
        <Route path="*" element={<Convite />} />
      </Routes>
    );
  }
  if (profile && !profile.onboarding_completed) return <Onboarding />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/vitrine/:slug" element={<VitrinePublica />} />
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/" element={<RequireModule module="dashboard"><Dashboard /></RequireModule>} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/financas" element={<RequireModule module="financas"><Financas /></RequireModule>} />
        <Route path="/financas-pessoal" element={<FinancasPessoal />} />
        <Route path="/cartoes" element={<CartoesCredito />} />
        <Route path="/vendas" element={<RequireModule module="vendas"><Vendas /></RequireModule>} />
        <Route path="/entregas" element={<RequireModule module="entregas"><Entregas /></RequireModule>} />
        <Route path="/vitrine" element={<RequireModule module="vitrine"><Vitrine /></RequireModule>} />
        <Route path="/marketing" element={<RequireModule module="marketing"><Marketing /></RequireModule>} />
        <Route path="/configuracoes" element={<RequireModule module="configuracoes"><Configuracoes /></RequireModule>} />
        <Route path="/planos" element={<Planos />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
