import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
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
import Vendas from "./pages/Vendas";
import Entregas from "./pages/Entregas";
import Configuracoes from "./pages/Configuracoes";
import Planos from "./pages/Planos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading } = useAuth();

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
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }
  if (profile && !profile.onboarding_completed) return <Onboarding />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="/financas" element={<Financas />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/entregas" element={<Entregas />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/planos" element={<Planos />} />
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
