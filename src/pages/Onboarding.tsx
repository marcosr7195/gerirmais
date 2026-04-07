import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Rocket } from "lucide-react";

const serviceTypes = [
  "Consultoria", "Design", "Desenvolvimento", "Marketing",
  "Contabilidade", "Advocacia", "Saúde", "Educação",
  "Beleza e Estética", "Manutenção", "Outro"
];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [document, setDocument] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !serviceType) {
      toast.error("Preencha o nome do negócio e tipo de serviço.");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: businessName.trim(),
        service_type: serviceType,
        document: document.trim() || null,
        onboarding_completed: true,
      })
      .eq("user_id", user!.id);

    if (error) {
      toast.error("Erro ao salvar. Tente novamente.");
    } else {
      toast.success("Bem-vindo ao MeuERP!");
      await refreshProfile();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Rocket className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Configure seu negócio</CardTitle>
          <p className="text-muted-foreground text-sm">Precisamos de algumas informações para começar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do negócio *</Label>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex: João Design Studio" required />
            </div>
            <div className="space-y-2">
              <Label>Tipo de serviço *</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CNPJ ou CPF (opcional)</Label>
              <Input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Começar a usar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
