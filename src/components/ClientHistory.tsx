import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Phone, MessageCircle, Mail, Users, MapPin, FileText, Settings, Plus,
  Search, Pencil, Trash2, Bell,
} from "lucide-react";
import { toast } from "sonner";

interface Interaction {
  id: string;
  interaction_type: string;
  interaction_date: string;
  duration_minutes: number | null;
  subject: string | null;
  summary: string | null;
  next_step: string | null;
  reminder_date: string | null;
  is_automatic: boolean;
}

const TYPE_OPTIONS = [
  { key: "ligacao", label: "Ligação", icon: Phone, color: "text-blue-500 bg-blue-500/10" },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-500 bg-green-500/10" },
  { key: "email", label: "Email", icon: Mail, color: "text-purple-500 bg-purple-500/10" },
  { key: "reuniao", label: "Reunião", icon: Users, color: "text-orange-500 bg-orange-500/10" },
  { key: "visita", label: "Visita", icon: MapPin, color: "text-pink-500 bg-pink-500/10" },
  { key: "proposta", label: "Proposta Enviada", icon: FileText, color: "text-primary bg-primary/10" },
  { key: "sistema", label: "Sistema", icon: Settings, color: "text-muted-foreground bg-muted" },
  { key: "outro", label: "Outro", icon: Settings, color: "text-muted-foreground bg-muted" },
];

const getTypeMeta = (key: string) => TYPE_OPTIONS.find(t => t.key === key) || TYPE_OPTIONS[TYPE_OPTIONS.length - 1];

const emptyForm = () => ({
  interaction_type: "ligacao",
  interaction_date: new Date().toISOString().slice(0, 16),
  duration_minutes: "",
  subject: "",
  summary: "",
  next_step: "",
  reminder_date: "",
});

export function ClientHistory({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Interaction[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("client_interactions")
      .select("*")
      .eq("client_id", clientId)
      .order("interaction_date", { ascending: false });
    setItems((data as Interaction[]) || []);
  }, [user, clientId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setOpen(true); };

  const openEdit = (it: Interaction) => {
    setEditingId(it.id);
    setForm({
      interaction_type: it.interaction_type,
      interaction_date: new Date(it.interaction_date).toISOString().slice(0, 16),
      duration_minutes: it.duration_minutes?.toString() || "",
      subject: it.subject || "",
      summary: it.summary || "",
      next_step: it.next_step || "",
      reminder_date: it.reminder_date || "",
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      interaction_type: form.interaction_type,
      interaction_date: new Date(form.interaction_date).toISOString(),
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      subject: form.subject || null,
      summary: form.summary || null,
      next_step: form.next_step || null,
      reminder_date: form.reminder_date || null,
    };
    if (editingId) {
      const { error } = await supabase.from("client_interactions").update(payload).eq("id", editingId);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Interação atualizada!");
    } else {
      const { error } = await supabase.from("client_interactions").insert({
        ...payload, user_id: user!.id, client_id: clientId, is_automatic: false,
      });
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Interação registrada!");
    }
    setOpen(false); setEditingId(null); load();
  };

  const remove = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("client_interactions").delete().eq("id", deletingId);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Interação excluída!");
    setDeletingId(null); load();
  };

  const filtered = items.filter(it => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [it.subject, it.summary, it.next_step, getTypeMeta(it.interaction_type).label]
      .some(v => v?.toLowerCase().includes(q));
  });

  const fmtDate = (iso: string) => new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card className="glass-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Histórico de Atendimento
          </h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" />Adicionar Interação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar interação" : "Nova interação"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo *</Label>
                    <Select value={form.interaction_type} onValueChange={v => setForm({ ...form, interaction_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.filter(t => t.key !== "sistema").map(t => (
                          <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data e hora *</Label>
                    <Input type="datetime-local" value={form.interaction_date}
                      onChange={e => setForm({ ...form, interaction_date: e.target.value })} required />
                  </div>
                </div>
                {(form.interaction_type === "ligacao" || form.interaction_type === "reuniao") && (
                  <div className="space-y-2">
                    <Label>Duração (minutos)</Label>
                    <Input type="number" min="1" value={form.duration_minutes}
                      onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder="Ex: Apresentação inicial" />
                </div>
                <div className="space-y-2">
                  <Label>Resumo</Label>
                  <Textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })}
                    rows={3} placeholder="O que foi conversado..." />
                </div>
                <div className="space-y-2">
                  <Label>Próximo passo</Label>
                  <Input value={form.next_step} onChange={e => setForm({ ...form, next_step: e.target.value })}
                    placeholder="Ex: Enviar proposta na sexta" />
                </div>
                <div className="space-y-2">
                  <Label>Lembrete</Label>
                  <Input type="date" value={form.reminder_date}
                    onChange={e => setForm({ ...form, reminder_date: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">
                  {editingId ? "Salvar alterações" : "Registrar interação"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar no histórico..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {items.length === 0 ? "Nenhuma interação registrada ainda." : "Nenhum resultado encontrado."}
          </p>
        ) : (
          <div className="relative space-y-4 pl-2">
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />
            {filtered.map(it => {
              const meta = getTypeMeta(it.interaction_type);
              const Icon = meta.icon;
              return (
                <div key={it.id} className="relative flex gap-3 group">
                  <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{it.subject || meta.label}</span>
                          <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                          {it.is_automatic && <Badge variant="secondary" className="text-[10px]">Auto</Badge>}
                          {it.duration_minutes && (
                            <Badge variant="outline" className="text-[10px]">{it.duration_minutes} min</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(it.interaction_date)}</p>
                        {it.summary && <p className="text-sm mt-1 whitespace-pre-wrap">{it.summary}</p>}
                        {it.next_step && (
                          <p className="text-xs mt-1 text-muted-foreground">
                            <span className="font-medium">Próximo passo:</span> {it.next_step}
                          </p>
                        )}
                        {it.reminder_date && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-warning">
                            <Bell className="h-3 w-3" />
                            <span>Lembrete: {new Date(it.reminder_date).toLocaleDateString("pt-BR")}</span>
                          </div>
                        )}
                      </div>
                      {!it.is_automatic && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(it)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                            onClick={() => setDeletingId(it.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AlertDialog open={!!deletingId} onOpenChange={v => !v && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir interação?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
