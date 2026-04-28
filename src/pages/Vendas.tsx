import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, UserPlus, Pencil, Eye, ArrowLeft, FileText, Search } from "lucide-react";
import { ProposalGenerator } from "@/components/ProposalGenerator";
import { ClientHistory } from "@/components/ClientHistory";
import { ArchivedDealRow } from "@/components/sales/ArchivedDealRow";
import { ArchivedDealDetailsDialog } from "@/components/sales/ArchivedDealDetailsDialog";
import { FeatureGate } from "@/components/FeatureGate";
import { usePlan } from "@/hooks/usePlan";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Client {
  id: string; name: string; email: string | null; phone: string | null; origin: string | null; notes: string | null;
  person_type: string | null; document: string | null; trade_name: string | null;
  instagram: string | null; website: string | null;
  zip_code: string | null; street: string | null; number: string | null; complement: string | null;
  neighborhood: string | null; city: string | null; state: string | null;
  first_contact_date: string | null;
}
interface DealItem { id?: string; description: string; quantity: number; unit_price: number; }
interface Deal {
  id: string; title: string; stage: string; value: number; client_id: string | null;
  notes: string | null; fixed_value: boolean; os_created: boolean; closed_at: string | null; archived_at: string | null;
  clients?: Client | null; items?: DealItem[]; proposals?: { id: string; proposal_number: string; issue_date: string; total_value: number | null }[] | null;
  service_orders?: { id: string; title: string | null; completed_at: string | null; created_at?: string | null }[] | null;
  interactions?: { id: string; interaction_type: string; interaction_date: string; subject: string | null; summary: string | null; is_automatic: boolean }[] | null;
}

const stages = [
  { key: "lead", label: "Lead", color: "bg-primary/10 text-primary" },
  { key: "negociando", label: "Negociando", color: "bg-warning/10 text-warning" },
  { key: "fechado", label: "Fechado", color: "bg-success/10 text-success" },
  { key: "perdido", label: "Perdido", color: "bg-destructive/10 text-destructive" },
];

const originOptions = ["Indicação", "Instagram", "Google", "LinkedIn", "Evento", "Outro"];
const RECENT_CLOSED_DAYS = 7;

const isOlderThanDays = (value: string | null | undefined, days: number) => {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() >= days * 24 * 60 * 60 * 1000;
};

const emptyClientForm = (): Omit<Client, "id"> => ({
  name: "", email: "", phone: "", origin: "", notes: "",
  person_type: "pf", document: "", trade_name: "",
  instagram: "", website: "",
  zip_code: "", street: "", number: "", complement: "",
  neighborhood: "", city: "", state: "",
  first_contact_date: new Date().toISOString().slice(0, 10),
});

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

export default function Vendas() {
  const { user } = useAuth();
  const { hasFeature } = usePlan();
  const navigate = useNavigate();
  const handleOpenProposal = (deal: Deal) => {
    if (!hasFeature("proposta_pdf")) {
      toast.error("Esta funcionalidade está disponível no plano Pro — clique aqui para fazer upgrade", {
        action: { label: "Ver planos", onClick: () => navigate("/planos") },
      });
      return;
    }
    setProposalDeal(deal);
  };
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tab, setTab] = useState("pipeline");
  const [dealOpen, setDealOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isFixedValue, setIsFixedValue] = useState(false);
  const [dealForm, setDealForm] = useState({ title: "", client_id: "", stage: "lead", value: "", notes: "" });
  const [dealItems, setDealItems] = useState<DealItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [clientForm, setClientForm] = useState(emptyClientForm());
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState(false);
  const [editClientForm, setEditClientForm] = useState(emptyClientForm());
  const [proposalDeal, setProposalDeal] = useState<Deal | null>(null);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archivedDealId, setArchivedDealId] = useState<string | null>(null);
  const [archivedDetailsOpen, setArchivedDetailsOpen] = useState(false);

  useEffect(() => { if (user) { loadDeals(); loadClients(); } }, [user]);

  const loadDeals = async () => {
    const { data } = await supabase
      .from("deals")
      .select("*, clients(*), deal_items(*), proposals(id, proposal_number, issue_date, total_value), service_orders(id, title, completed_at, created_at), interactions:client_interactions(id, interaction_type, interaction_date, subject, summary, is_automatic)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    const dealData = (data || []) as any[];
    const autoArchiveIds = dealData
      .filter((deal) => {
        const hasCompletedOrder = (deal.service_orders || []).some((order: any) => !!order.completed_at);
        return deal.stage === "fechado" && !deal.archived_at && hasCompletedOrder;
      })
      .map((deal) => deal.id);

    const staleClosedIds = dealData
      .filter((deal) => deal.stage === "fechado" && !deal.archived_at && isOlderThanDays(deal.closed_at || deal.updated_at, RECENT_CLOSED_DAYS))
      .map((deal) => deal.id);

    const idsToArchive = Array.from(new Set([...autoArchiveIds, ...staleClosedIds]));

    if (idsToArchive.length > 0) {
      const archivedAt = new Date().toISOString();
      const { error } = await supabase.from("deals").update({ archived_at: archivedAt } as any).in("id", idsToArchive);
      if (!error) {
        dealData.forEach((deal) => {
          if (idsToArchive.includes(deal.id)) {
            deal.archived_at = archivedAt;
          }
        });
      }
    }

    setDeals(dealData.map(d => ({
      ...d,
      value: Number(d.value),
      fixed_value: !!(d as any).fixed_value,
      os_created: !!(d as any).os_created,
      clients: d.clients as any,
      proposals: (d.proposals || []) as any,
      service_orders: (d.service_orders || []) as any,
      interactions: (d.interactions || []) as any,
      items: ((d as any).deal_items || []).map((i: any) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
    })));
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).order("name");
    setClients((data as Client[]) || []);
  };

  const fetchCep = useCallback(async (cep: string, setter: (fn: (prev: any) => any) => void) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setter((prev: any) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch { /* ignore */ }
  }, []);

  // --- DEAL LOGIC (unchanged) ---
  const saveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = isFixedValue ? (parseFloat(dealForm.value) || 0) : dealItems.reduce((a, i) => a + i.quantity * i.unit_price, 0);
    const { data, error } = await supabase.from("deals").insert({
      user_id: user!.id, title: dealForm.title, client_id: dealForm.client_id || null,
      stage: dealForm.stage, value: total, fixed_value: isFixedValue, notes: dealForm.notes || null,
      closed_at: dealForm.stage === "fechado" ? new Date().toISOString() : null,
      archived_at: null,
    } as any).select().single();
    if (error) { toast.error("Erro ao criar negócio"); return; }
    if (!isFixedValue) {
      const validItems = dealItems.filter(i => i.description.trim());
      if (validItems.length > 0) {
        await supabase.from("deal_items").insert(validItems.map(i => ({
          user_id: user!.id, deal_id: data.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price,
        })));
      }
    }
    if (dealForm.stage === "fechado") {
      await createServiceOrder(data.id, dealForm.title, dealForm.client_id || null);
      await supabase.from("deals").update({ os_created: true } as any).eq("id", data.id);
    }
    toast.success("Negócio criado!");
    setDealOpen(false);
    setDealForm({ title: "", client_id: "", stage: "lead", value: "", notes: "" });
    setDealItems([{ description: "", quantity: 1, unit_price: 0 }]);
    setIsFixedValue(false);
    loadDeals();
  };

  const createServiceOrder = async (dealId: string, title: string, clientId: string | null) => {
    await supabase.from("service_orders").insert({
      user_id: user!.id, deal_id: dealId, client_id: clientId, title: `OS - ${title}`,
      status: "em_andamento", due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
  };

  const moveStage = async (dealId: string, newStage: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    const updateData: any = {
      stage: newStage,
      closed_at: newStage === "fechado" ? (deal.closed_at || new Date().toISOString()) : null,
      archived_at: newStage === "fechado" ? null : deal.archived_at ?? null,
    };
    if (newStage === "fechado" && !deal.os_created) {
      await createServiceOrder(dealId, deal.title, deal.client_id);
      updateData.os_created = true;
    }
    await supabase.from("deals").update(updateData).eq("id", dealId);
    loadDeals();
    toast.success("Negócio atualizado!");
  };

  const openEdit = (deal: Deal) => { setEditDeal(deal); setEditOpen(true); };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeal) return;
    const updateData: any = {
      title: editDeal.title, client_id: editDeal.client_id || null, stage: editDeal.stage,
      value: editDeal.value, fixed_value: editDeal.fixed_value, notes: editDeal.notes || null,
      closed_at: editDeal.stage === "fechado" ? (editDeal.closed_at || new Date().toISOString()) : null,
      archived_at: editDeal.stage === "fechado" ? null : editDeal.archived_at ?? null,
    };
    if (editDeal.stage === "fechado" && !editDeal.os_created) {
      await createServiceOrder(editDeal.id, editDeal.title, editDeal.client_id);
      updateData.os_created = true;
    }
    await supabase.from("deals").update(updateData).eq("id", editDeal.id);
    toast.success("Negócio atualizado!");
    setEditOpen(false); setEditDeal(null); loadDeals();
  };

  // --- CLIENT LOGIC ---
  const saveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("clients").insert({
      user_id: user!.id, name: clientForm.name,
      email: clientForm.email || null, phone: clientForm.phone || null,
      origin: clientForm.origin || null, notes: clientForm.notes || null,
      person_type: clientForm.person_type || "pf",
      document: clientForm.document || null, trade_name: clientForm.trade_name || null,
      instagram: clientForm.instagram || null, website: clientForm.website || null,
      zip_code: clientForm.zip_code || null, street: clientForm.street || null,
      number: clientForm.number || null, complement: clientForm.complement || null,
      neighborhood: clientForm.neighborhood || null, city: clientForm.city || null,
      state: clientForm.state || null, first_contact_date: clientForm.first_contact_date || null,
    } as any);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Cliente criado!");
    setClientOpen(false); setClientForm(emptyClientForm()); loadClients();
  };

  const saveEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewClient) return;
    const { error } = await supabase.from("clients").update({
      name: editClientForm.name, email: editClientForm.email || null,
      phone: editClientForm.phone || null, origin: editClientForm.origin || null,
      notes: editClientForm.notes || null, person_type: editClientForm.person_type || "pf",
      document: editClientForm.document || null, trade_name: editClientForm.trade_name || null,
      instagram: editClientForm.instagram || null, website: editClientForm.website || null,
      zip_code: editClientForm.zip_code || null, street: editClientForm.street || null,
      number: editClientForm.number || null, complement: editClientForm.complement || null,
      neighborhood: editClientForm.neighborhood || null, city: editClientForm.city || null,
      state: editClientForm.state || null,
    } as any).eq("id", viewClient.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Cliente atualizado!");
    setEditingClient(false);
    const updated = { ...viewClient, ...editClientForm, id: viewClient.id };
    setViewClient(updated as Client);
    loadClients();
  };

  const openClientDetails = (c: Client) => {
    setViewClient(c);
    setEditingClient(false);
    setTab("cliente-detalhe");
  };

  const startEditClient = () => {
    if (!viewClient) return;
    setEditClientForm({
      name: viewClient.name || "", email: viewClient.email || "", phone: viewClient.phone || "",
      origin: viewClient.origin || "", notes: viewClient.notes || "",
      person_type: viewClient.person_type || "pf", document: viewClient.document || "",
      trade_name: viewClient.trade_name || "", instagram: viewClient.instagram || "",
      website: viewClient.website || "", zip_code: viewClient.zip_code || "",
      street: viewClient.street || "", number: viewClient.number || "",
      complement: viewClient.complement || "", neighborhood: viewClient.neighborhood || "",
      city: viewClient.city || "", state: viewClient.state || "",
      first_contact_date: viewClient.first_contact_date || "",
    });
    setEditingClient(true);
  };

  const addItem = () => setDealItems([...dealItems, { description: "", quantity: 1, unit_price: 0 }]);
  const updateItem = (idx: number, field: string, val: any) => {
    const items = [...dealItems]; (items[idx] as any)[field] = val; setDealItems(items);
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const total = dealItems.reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const visibleDeals = useMemo(() => deals.filter((deal) => {
    if (deal.archived_at) return false;
    if (deal.stage === "perdido") return false;
    if (deal.stage === "fechado") return !isOlderThanDays(deal.closed_at || null, RECENT_CLOSED_DAYS);
    return true;
  }), [deals]);

  const archivedDeals = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();
    return deals
      .filter((deal) => !!deal.archived_at)
      .filter((deal) => {
        if (!query) return true;
        return deal.title.toLowerCase().includes(query) || (deal.clients?.name || "").toLowerCase().includes(query);
      });
  }, [archiveSearch, deals]);

  const archivedDeal = useMemo(
    () => deals.find((deal) => deal.id === archivedDealId) || null,
    [archivedDealId, deals],
  );

  const openArchivedDetails = (dealId: string) => {
    setArchivedDealId(dealId);
    setArchivedDetailsOpen(true);
  };

  // --- CLIENT FORM FIELDS (reusable between create & edit) ---
  const renderClientFields = (form: ReturnType<typeof emptyClientForm>, setForm: (f: any) => void, isEdit = false) => (
    <>
      {/* Dados Pessoais / Empresa */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados Pessoais / Empresa</h3>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <RadioGroup value={form.person_type || "pf"} onValueChange={v => setForm({ ...form, person_type: v })} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="pf" id={`pf-${isEdit ? 'e' : 'c'}`} /><Label htmlFor={`pf-${isEdit ? 'e' : 'c'}`}>Pessoa Física</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="pj" id={`pj-${isEdit ? 'e' : 'c'}`} /><Label htmlFor={`pj-${isEdit ? 'e' : 'c'}`}>Pessoa Jurídica</Label></div>
          </RadioGroup>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{form.person_type === "pj" ? "Razão Social *" : "Nome completo *"}</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>{form.person_type === "pj" ? "CNPJ" : "CPF"}</Label>
            <Input
              value={form.document || ""}
              onChange={e => setForm({ ...form, document: form.person_type === "pj" ? cnpjMask(e.target.value) : cpfMask(e.target.value) })}
              placeholder={form.person_type === "pj" ? "00.000.000/0000-00" : "000.000.000-00"}
            />
          </div>
        </div>
        {form.person_type === "pj" && (
          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input value={form.trade_name || ""} onChange={e => setForm({ ...form, trade_name: e.target.value })} />
          </div>
        )}
      </div>

      {/* Contato */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contato</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>WhatsApp *</Label>
            <Input value={form.phone || ""} onChange={e => setForm({ ...form, phone: phoneMask(e.target.value) })} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Instagram</Label>
            <Input value={form.instagram || ""} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@perfil" />
          </div>
          <div className="space-y-2">
            <Label>Site</Label>
            <Input value={form.website || ""} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://" />
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Endereço</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input
              value={form.zip_code || ""}
              onChange={e => {
                const masked = cepMask(e.target.value);
                setForm({ ...form, zip_code: masked });
                if (masked.replace(/\D/g, "").length === 8) fetchCep(masked, setForm);
              }}
              placeholder="00000-000"
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Rua</Label>
            <Input value={form.street || ""} onChange={e => setForm({ ...form, street: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2"><Label>Número</Label><Input value={form.number || ""} onChange={e => setForm({ ...form, number: e.target.value })} /></div>
          <div className="space-y-2"><Label>Complemento</Label><Input value={form.complement || ""} onChange={e => setForm({ ...form, complement: e.target.value })} /></div>
          <div className="space-y-2"><Label>Bairro</Label><Input value={form.neighborhood || ""} onChange={e => setForm({ ...form, neighborhood: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Input value={form.state || ""} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2} />
          </div>
        </div>
        <div className="space-y-2"><Label>Cidade</Label><Input value={form.city || ""} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
      </div>

      {/* Informações Comerciais */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informações Comerciais</h3>
        <div className="space-y-2">
          <Label>Como nos conheceu</Label>
          <Select value={form.origin || ""} onValueChange={v => setForm({ ...form, origin: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{originOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Observações internas</Label>
          <Textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas — não aparece em propostas" rows={3} />
        </div>
        {!isEdit && (
          <div className="space-y-2">
            <Label>Data do primeiro contato</Label>
            <Input type="date" value={form.first_contact_date || ""} onChange={e => setForm({ ...form, first_contact_date: e.target.value })} />
          </div>
        )}
      </div>
    </>
  );

  // --- CLIENT DETAIL VIEW ---
  const renderClientDetail = () => {
    if (!viewClient) return null;
    const c = viewClient;

    if (editingClient) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingClient(false)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
            <h2 className="text-xl font-bold">Editar Cliente</h2>
          </div>
          <form onSubmit={saveEditClient} className="space-y-6 max-w-2xl">
            {renderClientFields(editClientForm, setEditClientForm, true)}
            <Button type="submit" className="w-full">Salvar alterações</Button>
          </form>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setTab("clientes")}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
            <h2 className="text-xl font-bold">{c.name}</h2>
            {c.person_type === "pj" && <Badge variant="secondary">PJ</Badge>}
          </div>
          <Button variant="outline" onClick={startEditClient}><Pencil className="h-4 w-4 mr-2" />Editar</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados</h3>
              {c.person_type === "pj" && c.trade_name && <Detail label="Nome Fantasia" value={c.trade_name} />}
              <Detail label={c.person_type === "pj" ? "CNPJ" : "CPF"} value={c.document} />
              <Detail label="Primeiro contato" value={c.first_contact_date} />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contato</h3>
              <Detail label="WhatsApp" value={c.phone} />
              <Detail label="Email" value={c.email} />
              <Detail label="Instagram" value={c.instagram} />
              <Detail label="Site" value={c.website} />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Endereço</h3>
              <Detail label="CEP" value={c.zip_code} />
              <Detail label="Rua" value={[c.street, c.number].filter(Boolean).join(", ")} />
              {c.complement && <Detail label="Complemento" value={c.complement} />}
              <Detail label="Bairro" value={c.neighborhood} />
              <Detail label="Cidade/UF" value={[c.city, c.state].filter(Boolean).join(" - ")} />
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Comercial</h3>
              <Detail label="Origem" value={c.origin} />
              <Detail label="Observações" value={c.notes} />
            </CardContent>
          </Card>
        </div>

        <FeatureGate feature="historico_cliente">
          <ClientHistory clientId={c.id} />
        </FeatureGate>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-muted-foreground">Gerencie clientes e pipeline</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={clientOpen} onOpenChange={setClientOpen}>
            <DialogTrigger asChild><Button variant="outline"><UserPlus className="h-4 w-4 mr-2" />Novo cliente</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
              <form onSubmit={saveClient} className="space-y-6">
                {renderClientFields(clientForm, setClientForm)}
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={dealOpen} onOpenChange={setDealOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo negócio</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo negócio / Orçamento</DialogTitle></DialogHeader>
              <form onSubmit={saveDeal} className="space-y-4">
                <div className="space-y-2"><Label>Título *</Label><Input value={dealForm.title} onChange={e => setDealForm({ ...dealForm, title: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={dealForm.client_id} onValueChange={v => setDealForm({ ...dealForm, client_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Etapa</Label>
                    <Select value={dealForm.stage} onValueChange={v => setDealForm({ ...dealForm, stage: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isFixedValue} onCheckedChange={setIsFixedValue} />
                  <Label>Valor fixo do contrato</Label>
                </div>
                {isFixedValue ? (
                  <div className="space-y-2"><Label>Valor total do contrato</Label><Input type="number" step="0.01" placeholder="Ex: 5000.00" value={dealForm.value} onChange={e => setDealForm({ ...dealForm, value: e.target.value })} /></div>
                ) : (
                  <div>
                    <Label className="mb-2 block">Itens do orçamento</Label>
                    <div className="space-y-2">
                      {dealItems.map((item, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2">
                          <Input className="col-span-6" placeholder="Descrição" value={item.description} onChange={e => updateItem(i, "description", e.target.value)} />
                          <Input className="col-span-2" type="number" placeholder="Qtd" value={item.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} />
                          <Input className="col-span-4" type="number" step="0.01" placeholder="Preço" value={item.unit_price} onChange={e => updateItem(i, "unit_price", Number(e.target.value))} />
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Adicionar item</Button>
                    <p className="text-sm font-medium mt-2">Total: {fmt(total)}</p>
                  </div>
                )}
                <div className="space-y-2"><Label>Observações</Label><Input value={dealForm.notes} onChange={e => setDealForm({ ...dealForm, notes: e.target.value })} /></div>
                <Button type="submit" className="w-full">Criar negócio</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="arquivo">Negócios fechados</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          {viewClient && <TabsTrigger value="cliente-detalhe">Detalhes</TabsTrigger>}
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stages.map(stage => {
              const stageDeals = visibleDeals.filter(d => d.stage === stage.key);
              return (
                <div key={stage.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={stage.color}>{stage.label}</Badge>
                    <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {stageDeals.map(deal => (
                      <Card key={deal.id} className="glass-card group">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium">{deal.title}</p>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(deal)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">{(deal.clients as any)?.name || "Sem cliente"}</p>
                          <p className="text-sm font-semibold text-primary">{fmt(deal.value)}</p>
                          {deal.fixed_value && <Badge variant="secondary" className="text-[10px]">Valor fixo</Badge>}
                          <div className="flex gap-1 flex-wrap">
                            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => handleOpenProposal(deal)}>
                              <FileText className="h-3 w-3 mr-1" />Proposta
                            </Button>
                            {stages.filter(s => s.key !== deal.stage).map(s => (
                              <Button key={s.key} variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => moveStage(deal.id, s.key)}>→ {s.label}</Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="arquivo" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                  placeholder="Buscar por cliente ou serviço"
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {archivedDeals.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center text-muted-foreground">Nenhum negócio arquivado encontrado</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {archivedDeals.map((deal) => (
                <ArchivedDealRow key={deal.id} deal={deal} onOpenDetails={openArchivedDetails} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado</p>
              ) : (
                <div className="divide-y">
                  {clients.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => openClientDetails(c)}>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.origin && <Badge variant="secondary" className="text-xs">{c.origin}</Badge>}
                        {c.person_type === "pj" && <Badge variant="outline" className="text-xs">PJ</Badge>}
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cliente-detalhe" className="mt-4">
          {renderClientDetail()}
        </TabsContent>
      </Tabs>

      {/* Modal de edição de deal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar negócio</DialogTitle></DialogHeader>
          {editDeal && (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="space-y-2"><Label>Título *</Label><Input value={editDeal.title} onChange={e => setEditDeal({ ...editDeal, title: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={editDeal.client_id || ""} onValueChange={v => setEditDeal({ ...editDeal, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Etapa</Label>
                  <Select value={editDeal.stage} onValueChange={v => setEditDeal({ ...editDeal, stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editDeal.fixed_value} onCheckedChange={v => setEditDeal({ ...editDeal, fixed_value: v })} />
                <Label>Valor fixo do contrato</Label>
              </div>
              <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" value={editDeal.value} onChange={e => setEditDeal({ ...editDeal, value: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Observações</Label><Input value={editDeal.notes || ""} onChange={e => setEditDeal({ ...editDeal, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full">Salvar alterações</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Proposal Generator */}
      {proposalDeal && (
        <ProposalGenerator
          deal={proposalDeal}
          open={!!proposalDeal}
          onOpenChange={(v) => { if (!v) setProposalDeal(null); }}
        />
      )}

      <ArchivedDealDetailsDialog
        open={archivedDetailsOpen}
        deal={archivedDeal}
        onOpenChange={setArchivedDetailsOpen}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value || "—"}</p>
    </div>
  );
}
