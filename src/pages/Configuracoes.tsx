import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Upload, Building2, User, FileText, Phone, MapPin, Landmark } from "lucide-react";

const phoneMask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const cpfMask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const cnpjMask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

const cepMask = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

export default function Configuracoes() {
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    slogan: "",
    owner_name: "",
    owner_role: "",
    fiscal_type: "mei",
    fiscal_document: "",
    company_name: "",
    whatsapp: "",
    commercial_email: "",
    website: "",
    instagram: "",
    zip_code: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    bank_name: "",
    account_type: "corrente",
    agency: "",
    account_number: "",
    pix_key: "",
    account_holder: "",
    logo_url: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        business_name: profile.business_name || "",
        slogan: profile.slogan || "",
        owner_name: profile.owner_name || "",
        owner_role: profile.owner_role || "",
        fiscal_type: profile.fiscal_type || "mei",
        fiscal_document: profile.fiscal_document || "",
        company_name: profile.company_name || "",
        whatsapp: profile.whatsapp || "",
        commercial_email: profile.commercial_email || "",
        website: profile.website || "",
        instagram: profile.instagram || "",
        zip_code: profile.zip_code || "",
        street: profile.street || "",
        number: profile.number || "",
        complement: profile.complement || "",
        neighborhood: profile.neighborhood || "",
        city: profile.city || "",
        state: profile.state || "",
        bank_name: profile.bank_name || "",
        account_type: profile.account_type || "corrente",
        agency: profile.agency || "",
        account_number: profile.account_number || "",
        pix_key: profile.pix_key || "",
        account_holder: profile.account_holder || "",
        logo_url: profile.logo_url || "",
      });
    }
  }, [profile]);

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((p) => ({
          ...p,
          street: data.logradouro || p.street,
          neighborhood: data.bairro || p.neighborhood,
          city: data.localidade || p.city,
          state: data.uf || p.state,
        }));
      }
    } catch {}
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Apenas PNG ou JPG são aceitos.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB.");
      return;
    }
    setUploading(true);
    const path = `${user.id}/logo.${file.type === "image/png" ? "png" : "jpg"}`;
    const { error } = await supabase.storage.from("business-logos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erro ao enviar logo.");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(path);
    set("logo_url", urlData.publicUrl + "?t=" + Date.now());
    setUploading(false);
    toast.success("Logo enviado!");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: form.business_name || null,
        slogan: form.slogan || null,
        owner_name: form.owner_name || null,
        owner_role: form.owner_role || null,
        fiscal_type: form.fiscal_type,
        fiscal_document: form.fiscal_document || null,
        company_name: form.company_name || null,
        whatsapp: form.whatsapp || null,
        commercial_email: form.commercial_email || null,
        website: form.website || null,
        instagram: form.instagram || null,
        zip_code: form.zip_code || null,
        street: form.street || null,
        number: form.number || null,
        complement: form.complement || null,
        neighborhood: form.neighborhood || null,
        city: form.city || null,
        state: form.state || null,
        bank_name: form.bank_name || null,
        account_type: form.account_type,
        agency: form.agency || null,
        account_number: form.account_number || null,
        pix_key: form.pix_key || null,
        account_holder: form.account_holder || null,
        logo_url: form.logo_url || null,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao salvar configurações.");
    } else {
      toast.success("Configurações salvas com sucesso!");
      await refreshProfile();
    }
    setSaving(false);
  };

  const docMask = form.fiscal_type === "pf" ? cpfMask : cnpjMask;
  const docPlaceholder = form.fiscal_type === "pf" ? "000.000.000-00" : "00.000.000/0000-00";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-sm">Gerencie os dados do seu negócio</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      {/* Identidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Building2 className="h-5 w-5" /> Identidade do Negócio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted shrink-0">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <Label>Logo do negócio</Label>
              <Input type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} disabled={uploading} className="max-w-xs" />
              <p className="text-xs text-muted-foreground">PNG ou JPG, máximo 2MB</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do negócio</Label>
              <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Ex: GerirMais" />
            </div>
            <div className="space-y-2">
              <Label>Slogan (opcional)</Label>
              <Input value={form.slogan} onChange={(e) => set("slogan", e.target.value)} placeholder="Ex: Gestão simplificada" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsável */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" /> Dados do Responsável</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} placeholder="Nome do responsável" />
          </div>
          <div className="space-y-2">
            <Label>Cargo ou função</Label>
            <Input value={form.owner_role} onChange={(e) => set("owner_role", e.target.value)} placeholder="Ex: Diretor, Fundador" />
          </div>
        </CardContent>
      </Card>

      {/* Fiscal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Dados Fiscais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.fiscal_type} onValueChange={(v) => set("fiscal_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mei">MEI</SelectItem>
                  <SelectItem value="pf">Pessoa Física</SelectItem>
                  <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{form.fiscal_type === "pf" ? "CPF" : "CNPJ"}</Label>
              <Input value={form.fiscal_document} onChange={(e) => set("fiscal_document", docMask(e.target.value))} placeholder={docPlaceholder} />
            </div>
            {form.fiscal_type !== "pf" && (
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Razão social" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Phone className="h-5 w-5" /> Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>WhatsApp comercial</Label>
            <Input value={form.whatsapp} onChange={(e) => set("whatsapp", phoneMask(e.target.value))} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-2">
            <Label>Email comercial</Label>
            <Input type="email" value={form.commercial_email} onChange={(e) => set("commercial_email", e.target.value)} placeholder="contato@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label>Site (opcional)</Label>
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://www.site.com" />
          </div>
          <div className="space-y-2">
            <Label>Instagram (opcional)</Label>
            <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@seuperfil" />
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5" /> Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={form.zip_code}
                onChange={(e) => {
                  const masked = cepMask(e.target.value);
                  set("zip_code", masked);
                  if (masked.replace(/\D/g, "").length === 8) fetchCep(masked);
                }}
                placeholder="00000-000"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Rua</Label>
              <Input value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="Logradouro" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="Nº" />
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input value={form.complement} onChange={(e) => set("complement", e.target.value)} placeholder="Sala, andar..." />
            </div>
            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Bairro" />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cidade" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="UF" maxLength={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados Bancários */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Landmark className="h-5 w-5" /> Dados Bancários para Proposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder="Ex: Nubank, Itaú" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de conta</Label>
              <Select value={form.account_type} onValueChange={(v) => set("account_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input value={form.agency} onChange={(e) => set("agency", e.target.value)} placeholder="0001" />
            </div>
            <div className="space-y-2">
              <Label>Conta</Label>
              <Input value={form.account_number} onChange={(e) => set("account_number", e.target.value)} placeholder="00000-0" />
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input value={form.pix_key} onChange={(e) => set("pix_key", e.target.value)} placeholder="CPF, email, telefone..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nome do titular</Label>
            <Input value={form.account_holder} onChange={(e) => set("account_holder", e.target.value)} placeholder="Nome completo do titular" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
