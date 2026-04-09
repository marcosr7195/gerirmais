import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ChecklistItem { id: string; title: string; completed: boolean | null; }
interface ServiceOrder {
  id: string; title: string; status: string; due_date: string | null;
  client_id: string | null; deal_id: string | null; completed_at: string | null;
  clients?: { name: string } | null;
  checklist?: ChecklistItem[];
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  em_andamento: { label: "Em andamento", icon: Clock, color: "bg-primary/10 text-primary" },
  concluido: { label: "Concluído", icon: CheckCircle2, color: "bg-success/10 text-success" },
  atrasado: { label: "Atrasado", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
};

export default function Entregas() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", client_id: "", due_date: "" });
  const [checklistInput, setChecklistInput] = useState("");
  const [selectedOS, setSelectedOS] = useState<string | null>(null);
  const [newCheckItem, setNewCheckItem] = useState("");

  useEffect(() => { if (user) { load(); loadClients(); } }, [user]);

  const load = async () => {
    const { data } = await supabase.from("service_orders").select("*, clients(name)").eq("user_id", user!.id).order("created_at", { ascending: false });
    const osData = (data || []) as any[];
    // Load checklists
    const ids = osData.map(o => o.id);
    let checklistData: any[] = [];
    if (ids.length > 0) {
      const { data: cl } = await supabase.from("checklist_items").select("*").in("service_order_id", ids);
      checklistData = cl || [];
    }
    setOrders(osData.map(o => ({
      ...o,
      clients: o.clients as any,
      checklist: checklistData.filter(c => c.service_order_id === o.id),
    })));
  };

  const loadClients = async () => {
    const { data } = await supabase.from("clients").select("id, name").eq("user_id", user!.id);
    setClients(data || []);
  };

  const saveOS = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from("service_orders").insert({
      user_id: user!.id,
      title: form.title,
      client_id: form.client_id || null,
      due_date: form.due_date || null,
      status: "em_andamento",
    }).select().single();
    if (error) { toast.error("Erro ao criar OS"); return; }

    // Add checklist items
    const items = checklistInput.split("\n").filter(l => l.trim());
    if (items.length > 0) {
      await supabase.from("checklist_items").insert(items.map(t => ({
        user_id: user!.id, service_order_id: data.id, title: t.trim(), completed: false,
      })));
    }

    toast.success("OS criada!");
    setOpen(false);
    setForm({ title: "", client_id: "", due_date: "" });
    setChecklistInput("");
    load();
  };

  const toggleCheck = async (checkId: string, completed: boolean) => {
    await supabase.from("checklist_items").update({ completed: !completed }).eq("id", checkId);
    load();
  };

  const addCheckItem = async (osId: string) => {
    if (!newCheckItem.trim()) return;
    await supabase.from("checklist_items").insert({
      user_id: user!.id, service_order_id: osId, title: newCheckItem.trim(), completed: false,
    });
    setNewCheckItem("");
    load();
  };

  const completeOS = async (os: ServiceOrder) => {
    await supabase.from("service_orders").update({ status: "concluido", completed_at: new Date().toISOString() }).eq("id", os.id);

    // Find related deal value
    if (os.deal_id) {
      const { data: deal } = await supabase.from("deals").select("value, title").eq("id", os.deal_id).single();
      if (deal && Number(deal.value) > 0) {
        await supabase.from("transactions").insert({
          user_id: user!.id,
          service_order_id: os.id,
          type: "receita",
          category: "Serviço",
          description: `OS concluída - ${deal.title}`,
          amount: Number(deal.value),
          date: new Date().toISOString().slice(0, 10),
          status: "recebido",
        });
        toast.success("OS concluída e receita lançada!");
      } else {
        toast.success("OS concluída!");
      }
    } else {
      toast.success("OS concluída!");
    }
    load();
  };

  const changeStatus = async (osId: string, status: string) => {
    if (status === "concluido") {
      const os = orders.find(o => o.id === osId);
      if (os) { completeOS(os); return; }
    }
    await supabase.from("service_orders").update({ status }).eq("id", osId);
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operação</h1>
          <p className="text-muted-foreground">Ordens de serviço e checklists</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova OS</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
            <form onSubmit={saveOS} className="space-y-4">
              <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Checklist (um item por linha)</Label>
                <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={checklistInput} onChange={e => setChecklistInput(e.target.value)} placeholder="Etapa 1&#10;Etapa 2&#10;Etapa 3" />
              </div>
              <Button type="submit" className="w-full">Criar OS</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {orders.length === 0 ? (
        <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">Nenhuma ordem de serviço</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {orders.map(os => {
            const cfg = statusConfig[os.status] || statusConfig.em_andamento;
            const Icon = cfg.icon;
            const expanded = selectedOS === os.id;
            const checkDone = (os.checklist || []).filter(c => c.completed).length;
            const checkTotal = (os.checklist || []).length;

            return (
              <Card key={os.id} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between cursor-pointer" onClick={() => setSelectedOS(expanded ? null : os.id)}>
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${cfg.color.split(" ")[1]}`} />
                      <div>
                        <p className="font-medium">{os.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {(os.clients as any)?.name || "Sem cliente"}
                          {os.due_date && ` · Prazo: ${new Date(os.due_date + "T12:00:00").toLocaleDateString("pt-BR")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {checkTotal > 0 && <span className="text-xs text-muted-foreground">{checkDone}/{checkTotal}</span>}
                      <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                      {os.status !== "concluido" && (
                        <Select value={os.status} onValueChange={(v) => changeStatus(os.id, v)}>
                          <SelectTrigger className="w-auto h-7 text-xs border-0 bg-transparent"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="em_andamento">Em andamento</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      {(os.checklist || []).map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Checkbox checked={!!item.completed} onCheckedChange={() => toggleCheck(item.id, !!item.completed)} />
                          <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <Input placeholder="Novo item..." value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCheckItem(os.id))} className="text-sm h-8" />
                        <Button size="sm" variant="outline" onClick={() => addCheckItem(os.id)}>+</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
