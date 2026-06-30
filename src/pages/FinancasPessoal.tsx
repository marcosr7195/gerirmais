import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Wallet, TrendingUp, TrendingDown, Settings, Pencil, Trash2, CheckCircle, Clock } from "lucide-react";
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
  payment_method: string | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

type PeriodKey = "todos" | "hoje" | "semana" | "mes" | "mes_anterior" | "ano" | "personalizado";

function getPeriodRange(key: PeriodKey): { start: string; end: string } | null {
  if (key === "todos") return null;
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "hoje") { const s = fmt(now); return { start: s, end: s }; }
  if (key === "semana") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const mon = new Date(now); mon.setDate(now.getDate() - diff);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return { start: fmt(mon), end: fmt(sun) };
  }
  if (key === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: fmt(start), end: fmt(end) };
  }
  if (key === "mes_anterior") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: fmt(start), end: fmt(end) };
  }
  if (key === "ano") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { start: fmt(start), end: fmt(end) };
  }
  return null;
}

const DEFAULT_CATS: { name: string; type: "receita" | "despesa" }[] = [
  { name: "Pró-labore", type: "receita" },
  { name: "Freelance Externo", type: "receita" },
  { name: "Aluguel Recebido", type: "receita" },
  { name: "Investimentos", type: "receita" },
  { name: "Outras Rendas", type: "receita" },
  { name: "Moradia", type: "despesa" },
  { name: "Alimentação", type: "despesa" },
  { name: "Transporte", type: "despesa" },
  { name: "Saúde", type: "despesa" },
  { name: "Educação", type: "despesa" },
  { name: "Lazer", type: "despesa" },
  { name: "Assinaturas e Streaming", type: "despesa" },
  { name: "Cartão de Crédito", type: "despesa" },
  { name: "Investimentos", type: "despesa" },
  { name: "Outras Despesas", type: "despesa" },
];

export default function FinancasPessoal() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"receita" | "despesa">("despesa");
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [form, setForm] = useState({
    type: "receita",
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    status: "pendente",
    due_date: "",
    payment_method: "",
  });
  const [filter, setFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [periodFilter, setPeriodFilter] = useState<PeriodKey>("mes");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [baixaTx, setBaixaTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  useEffect(() => { if (user) { load(); loadCategories(); } }, [user]);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("new") === "1") {
      setOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("financas_pessoais")
      .select("*")
      .eq("user_id", user!.id)
      .order("date", { ascending: false });
    setTransactions((data || []).map((t: any) => ({ ...t, amount: Number(t.amount) })));
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("financas_pessoais_categorias")
      .select("*")
      .eq("user_id", user!.id)
      .order("name");
    const cats = data || [];
    if (cats.length === 0 && user) {
      await supabase
        .from("financas_pessoais_categorias")
        .insert(DEFAULT_CATS.map((d) => ({ ...d, user_id: user.id })));
      const { data: seeded } = await supabase
        .from("financas_pessoais_categorias")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      setCategories(seeded || []);
      return;
    }
    setCategories(cats);
  };

  const closeForm = () => {
    setOpen(false);
    setEditingTx(null);
    setForm({ type: "receita", category: "", description: "", amount: "", date: new Date().toISOString().slice(0, 10), status: "pendente", due_date: "", payment_method: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      type: form.type,
      category: form.category || null,
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      status: form.status,
      due_date: form.due_date || null,
      payment_method: form.payment_method || null,
      paid_at:
        form.status === "pago" || form.status === "recebido"
          ? editingTx?.paid_at ?? new Date().toISOString()
          : null,
    };
    if (editingTx) {
      const { error } = await supabase.from("financas_pessoais").update(payload).eq("id", editingTx.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Lançamento atualizado!");
    } else {
      const { error } = await supabase.from("financas_pessoais").insert({ user_id: user!.id, ...payload });
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Lançamento criado!");
    }
    closeForm();
    load();
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setForm({
      type: tx.type,
      category: tx.category || "",
      description: tx.description,
      amount: String(tx.amount),
      date: tx.date,
      status: tx.status || "pendente",
      due_date: tx.due_date || "",
      payment_method: tx.payment_method || "",
    });
    setOpen(true);
  };

  const deleteTransaction = async () => {
    if (!deletingTx) return;
    const { error } = await supabase.from("financas_pessoais").delete().eq("id", deletingTx.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Lançamento excluído!");
    setDeletingTx(null);
    load();
  };

  const darBaixa = async () => {
    if (!baixaTx) return;
    const newStatus = baixaTx.type === "receita" ? "recebido" : "pago";
    await supabase.from("financas_pessoais").update({ status: newStatus, paid_at: new Date().toISOString() }).eq("id", baixaTx.id);
    toast.success("Baixa realizada!");
    setBaixaTx(null);
    load();
  };

  const updateStatus = async (tx: Transaction, newStatus: string) => {
    const paid_at = newStatus === "pago" || newStatus === "recebido" ? new Date().toISOString() : null;
    await supabase.from("financas_pessoais").update({ status: newStatus, paid_at }).eq("id", tx.id);
    toast.success("Status atualizado!");
    load();
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const { error } = await supabase.from("financas_pessoais_categorias").insert({ user_id: user!.id, name: newCatName.trim(), type: newCatType });
    if (error) { toast.error("Erro ao criar categoria"); return; }
    toast.success("Categoria criada!");
    setNewCatName("");
    loadCategories();
  };

  const updateCategory = async () => {
    if (!editingCat || !editCatName.trim()) return;
    await supabase.from("financas_pessoais_categorias").update({ name: editCatName.trim() }).eq("id", editingCat.id);
    toast.success("Categoria atualizada!");
    setEditingCat(null);
    loadCategories();
  };

  const deleteCategory = async () => {
    if (!deletingCat) return;
    await supabase.from("financas_pessoais_categorias").delete().eq("id", deletingCat.id);
    toast.success("Categoria excluída!");
    setDeletingCat(null);
    loadCategories();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filtered = useMemo(() => {
    let result = transactions;
    if (periodFilter === "personalizado" && customStart && customEnd) {
      result = result.filter(t => t.date >= customStart && t.date <= customEnd);
    } else if (periodFilter !== "todos") {
      const range = getPeriodRange(periodFilter);
      if (range) result = result.filter(t => t.date >= range.start && t.date <= range.end);
    }
    if (filter !== "todos") result = result.filter(t => t.type === filter);
    if (statusFilter === "pendente") result = result.filter(t => t.status === "pendente");
    else if (statusFilter === "concluido") result = result.filter(t => t.status === "pago" || t.status === "recebido");
    if (categoryFilter !== "todos") result = result.filter(t => t.category === categoryFilter);
    return result;
  }, [transactions, filter, statusFilter, categoryFilter, periodFilter, customStart, customEnd]);

  const totalReceita = filtered.filter(t => t.type === "receita").reduce((a, t) => a + t.amount, 0);
  const totalDespesa = filtered.filter(t => t.type === "despesa").reduce((a, t) => a + t.amount, 0);
  const saldo = totalReceita - totalDespesa;
  const totalPendente = filtered.filter(t => t.status === "pendente").reduce((a, t) => a + t.amount, 0);

  const receitaCats = categories.filter(c => c.type === "receita");
  const despesaCats = categories.filter(c => c.type === "despesa");
  const filteredCats = form.type === "receita" ? receitaCats : despesaCats;

  const periodLabels: Record<PeriodKey, string> = {
    todos: "Todo período", hoje: "Hoje", semana: "Esta semana",
    mes: "Este mês", mes_anterior: "Mês anterior", ano: "Este ano", personalizado: "Personalizado",
  };

  const usedCategories = [...new Set(transactions.map(t => t.category).filter(Boolean))] as string[];

  // Cor de destaque para diferenciar PF: roxo
  const accent = "text-purple-500";
  const accentBg = "bg-purple-500/10";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${accentBg} flex items-center justify-center`}>
            <Wallet className={`h-5 w-5 ${accent}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Finanças Pessoal</h1>
            <p className="text-muted-foreground">Suas receitas e despesas pessoais — separadas da empresa</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Settings className="h-4 w-4 mr-2" />Categorias</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Gerenciar Categorias Pessoais</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Nova categoria" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} className="flex-1" />
                  <Select value={newCatType} onValueChange={(v) => setNewCatType(v as "receita" | "despesa")}>
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

          <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeForm())}>
            <DialogTrigger asChild>
              <Button className="bg-purple-500 hover:bg-purple-600 text-white"><Plus className="h-4 w-4 mr-2" />Novo lançamento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingTx ? "Editar lançamento" : "Novo lançamento pessoal"}</DialogTitle></DialogHeader>
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
                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>
                  <Select value={form.payment_method || "nao_informado"} onValueChange={(v) => setForm({ ...form, payment_method: v === "nao_informado" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao_informado">Não informado</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="debito">Cartão de Débito</SelectItem>
                      <SelectItem value="credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white">{editingTx ? "Salvar alterações" : "Salvar"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodKey)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(periodLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {periodFilter === "personalizado" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">De</Label>
                  <Input type="date" className="w-36" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Até</Label>
                  <Input type="date" className="w-36" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="receita">Receitas</SelectItem>
                  <SelectItem value="despesa">Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="concluido">Recebidos/Pagos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {usedCategories.sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
            <div><p className="text-xs text-muted-foreground">Total Entradas</p><p className="text-xl font-bold text-emerald-500">{fmt(totalReceita)}</p></div>
          </CardContent>
        </Card>
        <Card className="glass-card border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-xs text-muted-foreground">Total Saídas</p><p className="text-xl font-bold text-destructive">{fmt(totalDespesa)}</p></div>
          </CardContent>
        </Card>
        <Card className="glass-card border-purple-500/40 bg-purple-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${accentBg} flex items-center justify-center`}><Wallet className={`h-5 w-5 ${accent}`} /></div>
            <div><p className="text-xs text-muted-foreground">Saldo Pessoal do Período</p><p className={`text-xl font-bold ${accent}`}>{fmt(saldo)}</p></div>
          </CardContent>
        </Card>
        <Card className="glass-card border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Clock className="h-5 w-5 text-yellow-500" /></div>
            <div><p className="text-xs text-muted-foreground">Total Pendente</p><p className="text-xl font-bold text-yellow-500">{fmt(totalPendente)}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Lançamentos pessoais ({filtered.length})</CardTitle>
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
                      <div className={`w-2 h-2 rounded-full ${tx.type === "receita" ? "bg-emerald-500" : "bg-destructive"}`} />
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.category} · {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                          {tx.payment_method && ` · ${tx.payment_method}`}
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
                      <span className={`text-sm font-semibold ${tx.type === "receita" ? "text-emerald-500" : "text-destructive"}`}>
                        {tx.type === "receita" ? "+" : "-"}{fmt(tx.amount)}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(tx)} title="Editar">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeletingTx(tx)} title="Excluir">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingCat} onOpenChange={(o) => !o && setDeletingCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir a categoria "{deletingCat?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCategory}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <AlertDialog open={!!deletingTx} onOpenChange={(o) => !o && setDeletingTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingTx?.description}" no valor de {deletingTx ? fmt(deletingTx.amount) : ""}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTransaction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
