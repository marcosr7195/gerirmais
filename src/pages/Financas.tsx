import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, TrendingUp, TrendingDown, Settings, Pencil, Trash2, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: string;
  category: string | null;
  description: string;
  amount: number;
  date: string;
  status: string | null;
  due_date: string | null;
  paid_at: string | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function Financas() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ type: "receita", category: "", description: "", amount: "", date: new Date().toISOString().slice(0, 10), status: "pendente", due_date: "" });
  const [newCatType, setNewCatType] = useState("despesa");
  const [filter, setFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [baixaTx, setBaixaTx] = useState<Transaction | null>(null);

  useEffect(() => { if (user) { load(); loadCategories(); } }, [user]);

  const load = async () => {
    const { data } = await supabase.from("transactions").select("*").eq("user_id", user!.id).order("date", { ascending: false });
    setTransactions((data || []).map(t => ({ ...t, amount: Number(t.amount) })));
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").eq("user_id", user!.id).order("name");
    const cats = data || [];
    if (cats.length === 0 && user) {
      const defaults = [
        { name: "Consultoria", type: "receita" }, { name: "Mentoria", type: "receita" },
        { name: "Contrato Recorrente", type: "receita" }, { name: "Serviço Avulso", type: "receita" },
        { name: "Comissão", type: "receita" }, { name: "Produto Digital", type: "receita" },
        { name: "Outros Recebimentos", type: "receita" },
        { name: "Ferramentas e Software", type: "despesa" }, { name: "Marketing e Tráfego", type: "despesa" },
        { name: "Domínio e Hospedagem", type: "despesa" }, { name: "Telefone e Internet", type: "despesa" },
        { name: "Coworking e Escritório", type: "despesa" }, { name: "Pró-labore", type: "despesa" },
        { name: "Freelancer e Parceiro", type: "despesa" }, { name: "Capacitação", type: "despesa" },
        { name: "Impostos e Taxas", type: "despesa" }, { name: "Contador", type: "despesa" },
        { name: "Despesa Variável", type: "despesa" }, { name: "Investimento", type: "despesa" },
      ];
      await supabase.from("categories").insert(defaults.map(d => ({ ...d, user_id: user.id })));
      const { data: seeded } = await supabase.from("categories").select("*").eq("user_id", user.id).order("name");
      setCategories(seeded || []);
      return;
    }
    setCategories(cats);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("transactions").insert({
      user_id: user!.id,
      type: form.type,
      category: form.category || null,
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      status: form.status,
      due_date: form.due_date || null,
      paid_at: form.status === "pago" || form.status === "recebido" ? new Date().toISOString() : null,
    });
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Lançamento criado!");
    setOpen(false);
    setForm({ type: "receita", category: "", description: "", amount: "", date: new Date().toISOString().slice(0, 10), status: "pendente", due_date: "" });
    load();
  };

  const darBaixa = async () => {
    if (!baixaTx) return;
    const newStatus = baixaTx.type === "receita" ? "recebido" : "pago";
    await supabase.from("transactions").update({ status: newStatus, paid_at: new Date().toISOString() }).eq("id", baixaTx.id);
    toast.success("Baixa realizada!");
    setBaixaTx(null);
    load();
  };

  const updateStatus = async (tx: Transaction, newStatus: string) => {
    const paid_at = newStatus === "pago" || newStatus === "recebido" ? new Date().toISOString() : null;
    await supabase.from("transactions").update({ status: newStatus, paid_at }).eq("id", tx.id);
    toast.success("Status atualizado!");
    load();
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from("categories").insert({ user_id: user!.id, name: newCatName.trim(), type: newCatType });
    if (error) { toast.error("Erro ao criar categoria"); return; }
    toast.success("Categoria criada!");
    setNewCatName("");
    loadCategories();
  };

  const updateCategory = async () => {
    if (!editingCat || !editCatName.trim()) return;
    await supabase.from("categories").update({ name: editCatName.trim() }).eq("id", editingCat.id);
    toast.success("Categoria atualizada!");
    setEditingCat(null);
    loadCategories();
  };

  const deleteCategory = async () => {
    if (!deletingCat) return;
    await supabase.from("categories").delete().eq("id", deletingCat.id);
    toast.success("Categoria excluída!");
    setDeletingCat(null);
    loadCategories();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalReceita = transactions.filter(t => t.type === "receita").reduce((a, t) => a + t.amount, 0);
  const totalDespesa = transactions.filter(t => t.type === "despesa").reduce((a, t) => a + t.amount, 0);
  const saldo = totalReceita - totalDespesa;

  // Apply both type and status filters
  let filtered = filter === "todos" ? transactions : transactions.filter(t => t.type === filter);
  if (statusFilter === "pendente") {
    filtered = filtered.filter(t => t.status === "pendente");
  } else if (statusFilter === "concluido") {
    filtered = filtered.filter(t => t.status === "pago" || t.status === "recebido");
  }

  const now = new Date();
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short" });
    const monthTx = transactions.filter(t => t.date?.startsWith(key));
    chartData.push({
      month: label,
      receita: monthTx.filter(t => t.type === "receita").reduce((a, t) => a + t.amount, 0),
      despesa: monthTx.filter(t => t.type === "despesa").reduce((a, t) => a + t.amount, 0),
    });
  }

  const statusLabel: Record<string, string> = { pendente: "Pendente", pago: "Pago", recebido: "Recebido" };

  const receitaCats = categories.filter(c => c.type === "receita");
  const despesaCats = categories.filter(c => c.type === "despesa");
  const filteredCats = form.type === "receita" ? receitaCats : despesaCats;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finanças</h1>
          <p className="text-muted-foreground">Controle suas receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings className="h-4 w-4 mr-2" />Categorias</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Gerenciar Categorias</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Nova categoria" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} className="flex-1" />
                  <Select value={newCatType} onValueChange={setNewCatType}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addCategory}><Plus className="h-4 w-4" /></Button>
                </div>
                {["receita", "despesa"].map(tipo => {
                  const cats = tipo === "receita" ? receitaCats : despesaCats;
                  return (
                    <div key={tipo}>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">{tipo === "receita" ? "Receitas" : "Despesas"}</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {cats.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nenhuma</p>}
                        {cats.map(cat => (
                          <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                            {editingCat?.id === cat.id ? (
                              <div className="flex gap-2 flex-1">
                                <Input value={editCatName} onChange={e => setEditCatName(e.target.value)} onKeyDown={e => e.key === "Enter" && updateCategory()} />
                                <Button size="sm" onClick={updateCategory}>Salvar</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingCat(null)}>Cancelar</Button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm">{cat.name}</span>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingCat(cat); setEditCatName(cat.name); }}><Pencil className="h-3 w-3" /></Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeletingCat(cat)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: "" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {filteredCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Descrição</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Data</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value={form.type === "receita" ? "recebido" : "pago"}>{form.type === "receita" ? "Recebido" : "Pago"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                </div>
                <Button type="submit" className="w-full">Salvar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Saldo</p><p className="text-xl font-bold">{fmt(saldo)}</p></div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">Receitas</p><p className="text-xl font-bold">{fmt(totalReceita)}</p></div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-xs text-muted-foreground">Despesas</p><p className="text-xl font-bold">{fmt(totalDespesa)}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Fluxo de caixa mensal</CardTitle></CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Lançamentos</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="concluido">Recebidos/Pagos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos tipos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(tx => {
                const isPending = tx.status === "pendente";
                const statusBadgeClass = isPending
                  ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
                  : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";

                return (
                  <div key={tx.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isPending ? "bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/20" : "hover:bg-muted/50"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${tx.type === "receita" ? "bg-success" : "bg-destructive"}`} />
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.category} · {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                          {tx.paid_at && ` · ${tx.type === "receita" ? "Recebido" : "Pago"} em ${new Date(tx.paid_at).toLocaleDateString("pt-BR")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setBaixaTx(tx)}>
                          <CheckCircle className="h-3 w-3 mr-1" />Dar baixa
                        </Button>
                      )}
                      <Select value={tx.status || "pendente"} onValueChange={(v) => updateStatus(tx, v)}>
                        <SelectTrigger className={`h-7 w-auto min-w-[100px] text-xs border ${statusBadgeClass}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value={tx.type === "receita" ? "recebido" : "pago"}>{tx.type === "receita" ? "Recebido" : "Pago"}</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className={`text-sm font-semibold ${tx.type === "receita" ? "text-success" : "text-destructive"}`}>
                        {tx.type === "receita" ? "+" : "-"}{fmt(tx.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert dialog for category deletion */}
      <AlertDialog open={!!deletingCat} onOpenChange={(o) => !o && setDeletingCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir a categoria "{deletingCat?.name}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCategory}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert dialog for dar baixa confirmation */}
      <AlertDialog open={!!baixaTx} onOpenChange={(o) => !o && setBaixaTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{baixaTx?.type === "receita" ? "Confirmar recebimento" : "Confirmar pagamento"}</AlertDialogTitle>
            <AlertDialogDescription>
              {baixaTx?.type === "receita"
                ? `Confirmar recebimento de ${baixaTx ? fmt(baixaTx.amount) : ""}?`
                : `Confirmar pagamento de ${baixaTx ? fmt(baixaTx.amount) : ""}?`}
              <br />
              <span className="text-muted-foreground">{baixaTx?.description}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={darBaixa}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
