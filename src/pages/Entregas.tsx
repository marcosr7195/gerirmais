import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArchivedOrderDetailsDialog } from "@/components/operations/ArchivedOrderDetailsDialog";
import { ArchivedOrderRow } from "@/components/operations/ArchivedOrderRow";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChecklistItem {
  id: string;
  service_order_id?: string;
  title: string;
  completed: boolean | null;
  due_date?: string | null;
}

interface ServiceOrder {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  client_id: string | null;
  deal_id: string | null;
  completed_at: string | null;
  created_at?: string | null;
  clients?: { name: string } | null;
  deals?: { value: number | null; title: string | null } | null;
  checklist?: ChecklistItem[];
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  em_andamento: { label: "Em andamento", icon: Clock, color: "bg-primary/10 text-primary" },
  concluido: { label: "Concluído", icon: CheckCircle2, color: "bg-success/10 text-success" },
  atrasado: { label: "Atrasado", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  arquivado: { label: "Arquivado", icon: CheckCircle2, color: "bg-muted text-muted-foreground" },
};

const AUTO_ARCHIVE_HOURS = 24;

const isOlderThanAutoArchive = (completedAt: string | null) => {
  if (!completedAt) return false;
  return Date.now() - new Date(completedAt).getTime() >= AUTO_ARCHIVE_HOURS * 60 * 60 * 1000;
};

const formatCompactDate = (value: string | null) => {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
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
  const [newCheckDate, setNewCheckDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", title: "", client_id: "", due_date: "", status: "" });
  const loadedRef = useRef(false);

  useEffect(() => {
    if (user && !loadedRef.current) {
      loadedRef.current = true;
      void Promise.all([load(), loadClients()]);
    }
  }, [user]);

  const load = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("service_orders")
      .select("*, clients(name), deals(value, title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const osData = (data || []) as ServiceOrder[];
    const staleCompletedIds = osData.filter((order) => order.status === "concluido" && isOlderThanAutoArchive(order.completed_at)).map((order) => order.id);

    if (staleCompletedIds.length > 0) {
      const { error } = await supabase.from("service_orders").update({ status: "arquivado" }).in("id", staleCompletedIds);
      if (!error) {
        osData.forEach((order) => {
          if (staleCompletedIds.includes(order.id)) order.status = "arquivado";
        });
      }
    }

    const ids = osData.map((order) => order.id);
    let checklistData: ChecklistItem[] = [];

    if (ids.length > 0) {
      const { data: checklist } = await supabase.from("checklist_items").select("*").in("service_order_id", ids);
      checklistData = (checklist || []) as ChecklistItem[];
    }

    setOrders(
      osData.map((order) => ({
        ...order,
        checklist: checklistData.filter((item) => item.service_order_id === order.id),
      })),
    );
  };

  const loadClients = async () => {
    if (!user) return;
    const { data } = await supabase.from("clients").select("id, name").eq("user_id", user.id);
    setClients(data || []);
  };

  const saveOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("service_orders")
        .insert({
          user_id: user.id,
          title: form.title,
          client_id: form.client_id || null,
          due_date: form.due_date || null,
          status: "em_andamento",
        })
        .select()
        .single();

      if (error) {
        toast.error("Erro ao criar OS");
        return;
      }

      const items = checklistInput.split("\n").filter((line) => line.trim());
      if (items.length > 0) {
        await supabase.from("checklist_items").insert(
          items.map((title) => ({
            user_id: user.id,
            service_order_id: data.id,
            title: title.trim(),
            completed: false,
          })),
        );
      }

      toast.success("OS criada!");
      setOpen(false);
      setForm({ title: "", client_id: "", due_date: "" });
      setChecklistInput("");
      void load();
    } finally {
      setSaving(false);
    }
  };

  const updateOS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      if (editForm.status === "concluido") {
        const os = orders.find((order) => order.id === editForm.id);
        if (os) {
          await supabase
            .from("service_orders")
            .update({
              title: editForm.title,
              client_id: editForm.client_id || null,
              due_date: editForm.due_date || null,
            })
            .eq("id", editForm.id);
          await completeOS(os);
          setEditOpen(false);
          return;
        }
      }

      const { error } = await supabase
        .from("service_orders")
        .update({
          title: editForm.title,
          client_id: editForm.client_id || null,
          due_date: editForm.due_date || null,
          status: editForm.status,
        })
        .eq("id", editForm.id);

      if (error) {
        toast.error("Erro ao atualizar OS");
        return;
      }

      toast.success("OS atualizada!");
      setEditOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const deleteOS = async (osId: string) => {
    await supabase.from("checklist_items").delete().eq("service_order_id", osId);
    const { error } = await supabase.from("service_orders").delete().eq("id", osId);
    if (error) {
      toast.error("Erro ao excluir OS");
      return;
    }
    toast.success("OS excluída!");
    void load();
  };

  const openEdit = (os: ServiceOrder) => {
    setEditForm({
      id: os.id,
      title: os.title,
      client_id: os.client_id || "",
      due_date: os.due_date || "",
      status: os.status === "arquivado" ? "concluido" : os.status,
    });
    setEditOpen(true);
  };

  const toggleCheck = async (checkId: string, completed: boolean) => {
    await supabase.from("checklist_items").update({ completed: !completed }).eq("id", checkId);
    void load();
  };

  const updateCheckDate = async (checkId: string, dueDate: string) => {
    await supabase.from("checklist_items").update({ due_date: dueDate || null }).eq("id", checkId);
    void load();
  };

  const addCheckItem = async (osId: string) => {
    if (!user || !newCheckItem.trim()) return;
    await supabase.from("checklist_items").insert({
      user_id: user.id,
      service_order_id: osId,
      title: newCheckItem.trim(),
      completed: false,
      due_date: newCheckDate || null,
    });
    setNewCheckItem("");
    setNewCheckDate("");
    void load();
  };

  const archiveOS = async (osId: string) => {
    const { error } = await supabase.from("service_orders").update({ status: "arquivado" }).eq("id", osId);
    if (error) {
      toast.error("Erro ao arquivar OS");
      return;
    }
    toast.success("OS arquivada!");
    void load();
  };

  const completeOS = async (os: ServiceOrder) => {
    if (!user) return;

    await supabase.from("service_orders").update({ status: "concluido", completed_at: new Date().toISOString() }).eq("id", os.id);
    if (os.deal_id) {
      const { data: deal } = await supabase.from("deals").select("value, title").eq("id", os.deal_id).single();
      if (deal && Number(deal.value) > 0) {
        await supabase.from("transactions").insert({
          user_id: user.id,
          service_order_id: os.id,
          type: "receita",
          category: "Serviço",
          description: `OS concluída - ${deal.title}`,
          amount: Number(deal.value),
          date: new Date().toISOString().slice(0, 10),
          status: "pendente",
        });
        toast.success("OS concluída e receita lançada!");
      } else {
        toast.success("OS concluída!");
      }
    } else {
      toast.success("OS concluída!");
    }
    void load();
  };

  const changeStatus = async (osId: string, status: string) => {
    if (status === "concluido") {
      const os = orders.find((order) => order.id === osId);
      if (os) {
        await completeOS(os);
        return;
      }
    }

    await supabase.from("service_orders").update({ status }).eq("id", osId);
    void load();
  };

  const openDetails = (orderId: string) => {
    setDetailsOrderId(orderId);
    setDetailsOpen(true);
  };

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status === "em_andamento" || order.status === "atrasado"),
    [orders],
  );

  const archivedOrders = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();
    return orders
      .filter((order) => order.status === "concluido" || order.status === "arquivado")
      .filter((order) => {
        if (!query) return true;
        return order.title.toLowerCase().includes(query) || (order.clients?.name || "").toLowerCase().includes(query);
      });
  }, [archiveSearch, orders]);

  const detailsOrder = useMemo(
    () => orders.find((order) => order.id === detailsOrderId) || null,
    [detailsOrderId, orders],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Entregáveis</h1>
          <p className="text-muted-foreground">Ordens ativas e arquivo de serviços concluídos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nova OS
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Ordem de Serviço</DialogTitle>
            </DialogHeader>
            <form onSubmit={saveOS} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={form.client_id} onValueChange={(value) => setForm({ ...form, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Checklist (um item por linha)</Label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={checklistInput}
                  onChange={(e) => setChecklistInput(e.target.value)}
                  placeholder="Etapa 1&#10;Etapa 2&#10;Etapa 3"
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Salvando..." : "Criar OS"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={updateOS} className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={editForm.client_id} onValueChange={(value) => setEditForm({ ...editForm, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ArchivedOrderDetailsDialog open={detailsOpen} order={detailsOrder} onOpenChange={setDetailsOpen} />

      <Tabs defaultValue="ativas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ativas">Ativas</TabsTrigger>
          <TabsTrigger value="arquivo">Concluídas</TabsTrigger>
        </TabsList>

        <TabsContent value="ativas" className="space-y-4">
          {activeOrders.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center text-muted-foreground">Nenhuma ordem ativa no momento</CardContent>
            </Card>
          ) : (
            activeOrders.map((os) => {
              const cfg = statusConfig[os.status] || statusConfig.em_andamento;
              const Icon = cfg.icon;
              const expanded = selectedOS === os.id;
              const checkDone = (os.checklist || []).filter((item) => item.completed).length;
              const checkTotal = (os.checklist || []).length;

              return (
                <Card key={os.id} className="glass-card group">
                  <CardContent className="p-4">
                    <div className="flex cursor-pointer flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" onClick={() => setSelectedOS(expanded ? null : os.id)}>
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${cfg.color.split(" ")[1]}`} />
                        <div>
                          <p className="font-medium">{os.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {os.clients?.name || "Sem cliente"}
                            {os.due_date && ` · Prazo: ${formatCompactDate(os.due_date)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(os)}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir OS</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja excluir esta OS? Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteOS(os.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        {checkTotal > 0 && <span className="text-xs text-muted-foreground">{checkDone}/{checkTotal}</span>}
                        <Badge variant="outline" className={cfg.color}>
                          {cfg.label}
                        </Badge>
                        <Select value={os.status} onValueChange={(value) => changeStatus(os.id, value)}>
                          <SelectTrigger className="h-7 w-auto border-0 bg-transparent text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="em_andamento">Em andamento</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                            <SelectItem value="atrasado">Atrasado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-4 space-y-2 border-t pt-4">
                        {(os.checklist || []).map((item) => {
                          const today = new Date().toISOString().slice(0, 10);
                          const overdue = !!item.due_date && !item.completed && item.due_date < today;
                          return (
                            <div key={item.id} className="flex items-center gap-2">
                              <Checkbox checked={!!item.completed} onCheckedChange={() => toggleCheck(item.id, !!item.completed)} />
                              <span className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                                {item.title}
                                {item.due_date && (
                                  <span className={`ml-2 inline-flex items-center gap-1 text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                    {overdue && <AlertTriangle className="h-3 w-3" />}
                                    · até {formatCompactDate(item.due_date)}
                                  </span>
                                )}
                              </span>
                              <Input
                                type="date"
                                value={item.due_date || ""}
                                onChange={(e) => updateCheckDate(item.id, e.target.value)}
                                className="ml-auto h-7 w-auto text-xs"
                                title="Data de entrega"
                              />
                            </div>
                          );
                        })}
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder="Novo item..."
                            value={newCheckItem}
                            onChange={(e) => setNewCheckItem(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void addCheckItem(os.id))}
                            className="h-8 text-sm"
                          />
                          <Input
                            type="date"
                            value={newCheckDate}
                            onChange={(e) => setNewCheckDate(e.target.value)}
                            className="h-8 w-full text-sm sm:w-40"
                            title="Data de entrega (opcional)"
                          />
                          <Button size="sm" variant="outline" onClick={() => addCheckItem(os.id)}>
                            +
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="arquivo" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder="Buscar por OS ou cliente"
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {archivedOrders.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-8 text-center text-muted-foreground">Nenhuma OS concluída ou arquivada encontrada</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {archivedOrders.map((order) => (
                <ArchivedOrderRow
                  key={order.id}
                  order={order}
                  autoArchived={isOlderThanAutoArchive(order.completed_at)}
                  onArchive={archiveOS}
                  onOpenDetails={openDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
