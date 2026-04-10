import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, UserPlus, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Client { id: string; name: string; email: string | null; phone: string | null; origin: string | null; }
interface DealItem { id?: string; description: string; quantity: number; unit_price: number; }
interface Deal {
  id: string; title: string; stage: string; value: number; client_id: string | null;
  notes: string | null; fixed_value: boolean; os_created: boolean; clients?: Client | null; items?: DealItem[];
}

const stages = [
  { key: "lead", label: "Lead", color: "bg-primary/10 text-primary" },
  { key: "negociando", label: "Negociando", color: "bg-warning/10 text-warning" },
  { key: "fechado", label: "Fechado", color: "bg-success/10 text-success" },
  { key: "perdido", label: "Perdido", color: "bg-destructive/10 text-destructive" },
];

export default function Vendas() {
  const { user } = useAuth();
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
  const [clientForm, setClientForm] = useState({ name: "", email: "", phone: "", origin: "" });

  useEffect(() => { if (user) { loadDeals(); loadClients(); } }, [user]);

  const loadDeals = async () => {
    const { data } = await supabase.from("deals").select("*, clients(*)").eq("user_id", user!.id).order("created_at", { ascending: false });
    setDeals((data || []).map(d => ({ ...d, value: Number(d.value), fixed_value: !!(d as any).fixed_value, os_created: !!(d as any).os_created, clients: d.clients as any })));
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("*").eq("user_id", user!.id).order("name");
    setClients(data || []);
  };

  const saveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = isFixedValue ? (parseFloat(dealForm.value) || 0) : dealItems.reduce((a, i) => a + i.quantity * i.unit_price, 0);
    const { data, error } = await supabase.from("deals").insert({
      user_id: user!.id,
      title: dealForm.title,
      client_id: dealForm.client_id || null,
      stage: dealForm.stage,
      value: total,
      fixed_value: isFixedValue,
      notes: dealForm.notes || null,
    } as any).select().single();

    if (error) { toast.error("Erro ao criar negócio"); return; }

    if (!isFixedValue) {
      const validItems = dealItems.filter(i => i.description.trim());
      if (validItems.length > 0) {
        await supabase.from("deal_items").insert(validItems.map(i => ({
          user_id: user!.id, deal_id: data.id, description: i.description,
          quantity: i.quantity, unit_price: i.unit_price,
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
      user_id: user!.id,
      deal_id: dealId,
      client_id: clientId,
      title: `OS - ${title}`,
      status: "em_andamento",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
  };

  const moveStage = async (dealId: string, newStage: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    const updateData: any = { stage: newStage };

    if (newStage === "fechado" && !deal.os_created) {
      await createServiceOrder(dealId, deal.title, deal.client_id);
      updateData.os_created = true;
    }

    await supabase.from("deals").update(updateData).eq("id", dealId);
    loadDeals();
    toast.success("Negócio atualizado!");
  };

  const openEdit = (deal: Deal) => {
    setEditDeal(deal);
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeal) return;

    const updateData: any = {
      title: editDeal.title,
      client_id: editDeal.client_id || null,
      stage: editDeal.stage,
      value: editDeal.value,
      fixed_value: editDeal.fixed_value,
      notes: editDeal.notes || null,
    };

    const oldDeal = deals.find(d => d.id === editDeal.id);

    if (editDeal.stage === "fechado" && !editDeal.os_created) {
      await createServiceOrder(editDeal.id, editDeal.title, editDeal.client_id);
      updateData.os_created = true;
    }

    await supabase.from("deals").update(updateData).eq("id", editDeal.id);
    toast.success("Negócio atualizado!");
    setEditOpen(false);
    setEditDeal(null);
    loadDeals();
  };

  const saveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("clients").insert({
      user_id: user!.id, name: clientForm.name,
      email: clientForm.email || null, phone: clientForm.phone || null,
      origin: clientForm.origin || null,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Cliente criado!");
    setClientOpen(false);
    setClientForm({ name: "", email: "", phone: "", origin: "" });
    loadClients();
  };

  const addItem = () => setDealItems([...dealItems, { description: "", quantity: 1, unit_price: 0 }]);
  const updateItem = (idx: number, field: string, val: any) => {
    const items = [...dealItems];
    (items[idx] as any)[field] = val;
    setDealItems(items);
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const total = dealItems.reduce((a, i) => a + i.quantity * i.unit_price, 0);

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
            <DialogContent>
              <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
              <form onSubmit={saveClient} className="space-y-4">
                <div className="space-y-2"><Label>Nome *</Label><Input value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Telefone</Label><Input value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Origem</Label><Input value={clientForm.origin} onChange={e => setClientForm({ ...clientForm, origin: e.target.value })} placeholder="Ex: Instagram, Indicação" /></div>
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
                    <Select value={dealForm.client_id} onValueChange={(v) => setDealForm({ ...dealForm, client_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Etapa</Label>
                    <Select value={dealForm.stage} onValueChange={(v) => setDealForm({ ...dealForm, stage: v })}>
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
                  <div className="space-y-2">
                    <Label>Valor total do contrato</Label>
                    <Input type="number" step="0.01" placeholder="Ex: 5000.00" value={dealForm.value} onChange={e => setDealForm({ ...dealForm, value: e.target.value })} />
                  </div>
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
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {stages.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage.key);
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
                            {stages.filter(s => s.key !== deal.stage).map(s => (
                              <Button key={s.key} variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => moveStage(deal.id, s.key)}>
                                → {s.label}
                              </Button>
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

        <TabsContent value="clientes" className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-0">
              {clients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum cliente cadastrado</p>
              ) : (
                <div className="divide-y">
                  {clients.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email} · {c.phone}</p>
                      </div>
                      {c.origin && <Badge variant="secondary" className="text-xs">{c.origin}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de edição */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar negócio</DialogTitle></DialogHeader>
          {editDeal && (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="space-y-2"><Label>Título *</Label><Input value={editDeal.title} onChange={e => setEditDeal({ ...editDeal, title: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={editDeal.client_id || ""} onValueChange={(v) => setEditDeal({ ...editDeal, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Etapa</Label>
                  <Select value={editDeal.stage} onValueChange={(v) => setEditDeal({ ...editDeal, stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editDeal.fixed_value} onCheckedChange={(v) => setEditDeal({ ...editDeal, fixed_value: v })} />
                <Label>Valor fixo do contrato</Label>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" step="0.01" value={editDeal.value} onChange={e => setEditDeal({ ...editDeal, value: Number(e.target.value) })} />
              </div>
              <div className="space-y-2"><Label>Observações</Label><Input value={editDeal.notes || ""} onChange={e => setEditDeal({ ...editDeal, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full">Salvar alterações</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
