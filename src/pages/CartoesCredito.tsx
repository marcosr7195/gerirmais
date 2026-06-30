import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Plus, ChevronLeft, ChevronRight, AlertTriangle, Pencil, Trash2, ArrowLeft } from "lucide-react";

interface Card {
  id: string;
  name: string;
  brand: string;
  limit_total: number;
  closing_day: number;
  due_day: number;
  color: string;
}
interface Purchase {
  id: string;
  card_id: string;
  description: string;
  amount_total: number;
  purchase_date: string;
  category: string | null;
  installments_count: number;
}
interface Installment {
  id: string;
  purchase_id: string;
  card_id: string;
  installment_number: number;
  installments_total: number;
  amount: number;
  invoice_month: string; // YYYY-MM-DD (1st)
  status: string;
}
interface CategoryPF { id: string; name: string; type: string; }

const BRANDS = ["Visa", "Mastercard", "Elo", "American Express", "Hipercard", "Outra"];
const COLORS = ["#8b5cf6", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#0f172a", "#64748b"];
const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthLabel = (d: Date) => d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

function computeFirstInvoiceMonth(purchaseDate: string, closingDay: number): Date {
  const [y, m, d] = purchaseDate.split("-").map(Number);
  const day = d;
  // Closes day X -> goes to current month's invoice if day <= closingDay; else next month
  // Then the invoice is due the FOLLOWING month
  let month = m - 1; // 0-indexed
  let year = y;
  if (day > closingDay) month += 1;
  month += 1; // due month
  while (month > 11) { month -= 12; year += 1; }
  return new Date(year, month, 1);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function dueDate(invoiceMonth: Date, dueDay: number): Date {
  const last = new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth() + 1, 0).getDate();
  return new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth(), Math.min(dueDay, last));
}

export default function CartoesCredito() {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [categories, setCategories] = useState<CategoryPF[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [invoiceMonth, setInvoiceMonth] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  // Card form
  const [cardOpen, setCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardForm, setCardForm] = useState({ name: "", brand: "Visa", limit_total: "", closing_day: "1", due_day: "10", color: COLORS[0] });
  const [deletingCard, setDeletingCard] = useState<Card | null>(null);

  // Purchase form
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ description: "", amount_total: "", purchase_date: new Date().toISOString().slice(0, 10), category: "", installments_count: "1" });

  // Pay invoice confirm
  const [payConfirm, setPayConfirm] = useState<{ total: number; due: Date } | null>(null);

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    const [c, p, i, cat] = await Promise.all([
      supabase.from("credit_cards").select("*").eq("user_id", user!.id).order("created_at"),
      supabase.from("credit_card_purchases").select("*").eq("user_id", user!.id).order("purchase_date", { ascending: false }),
      supabase.from("credit_card_installments").select("*").eq("user_id", user!.id),
      supabase.from("financas_pessoais_categorias").select("*").eq("user_id", user!.id).eq("type", "despesa"),
    ]);
    setCards((c.data || []) as Card[]);
    setPurchases((p.data || []) as Purchase[]);
    setInstallments((i.data || []) as Installment[]);
    setCategories((cat.data || []) as CategoryPF[]);
  };

  // ===== Card CRUD =====
  const openNewCard = () => {
    setEditingCard(null);
    setCardForm({ name: "", brand: "Visa", limit_total: "", closing_day: "1", due_day: "10", color: COLORS[0] });
    setCardOpen(true);
  };
  const openEditCard = (c: Card) => {
    setEditingCard(c);
    setCardForm({ name: c.name, brand: c.brand, limit_total: String(c.limit_total), closing_day: String(c.closing_day), due_day: String(c.due_day), color: c.color });
    setCardOpen(true);
  };
  const saveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: cardForm.name.trim(),
      brand: cardForm.brand,
      limit_total: parseFloat(cardForm.limit_total) || 0,
      closing_day: Math.max(1, Math.min(31, parseInt(cardForm.closing_day) || 1)),
      due_day: Math.max(1, Math.min(31, parseInt(cardForm.due_day) || 1)),
      color: cardForm.color,
    };
    if (!payload.name) { toast.error("Informe o nome do cartão"); return; }
    if (editingCard) {
      const { error } = await supabase.from("credit_cards").update(payload).eq("id", editingCard.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Cartão atualizado!");
    } else {
      const { error } = await supabase.from("credit_cards").insert({ user_id: user!.id, ...payload });
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Cartão criado!");
    }
    setCardOpen(false);
    loadAll();
  };
  const deleteCard = async () => {
    if (!deletingCard) return;
    const { error } = await supabase.from("credit_cards").delete().eq("id", deletingCard.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Cartão excluído!");
    if (selectedCardId === deletingCard.id) setSelectedCardId(null);
    setDeletingCard(null);
    loadAll();
  };

  // ===== Purchase =====
  const openNewPurchase = () => {
    setPurchaseForm({ description: "", amount_total: "", purchase_date: new Date().toISOString().slice(0, 10), category: "", installments_count: "1" });
    setPurchaseOpen(true);
  };
  const savePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId) return;
    const card = cards.find(c => c.id === selectedCardId);
    if (!card) return;
    const total = parseFloat(purchaseForm.amount_total);
    const count = Math.max(1, Math.min(24, parseInt(purchaseForm.installments_count) || 1));
    if (!purchaseForm.description.trim() || isNaN(total) || total <= 0) {
      toast.error("Preencha descrição e valor");
      return;
    }
    const { data: p, error } = await supabase.from("credit_card_purchases").insert({
      user_id: user!.id,
      card_id: card.id,
      description: purchaseForm.description.trim(),
      amount_total: total,
      purchase_date: purchaseForm.purchase_date,
      category: purchaseForm.category || null,
      installments_count: count,
    }).select().single();
    if (error || !p) { toast.error("Erro ao salvar compra"); return; }

    const installmentAmount = Math.round((total / count) * 100) / 100;
    const firstInvoice = computeFirstInvoiceMonth(purchaseForm.purchase_date, card.closing_day);
    const rows = Array.from({ length: count }, (_, idx) => {
      const inv = addMonths(firstInvoice, idx);
      // Adjust last installment to absorb rounding
      const amount = idx === count - 1 ? Math.round((total - installmentAmount * (count - 1)) * 100) / 100 : installmentAmount;
      return {
        user_id: user!.id,
        purchase_id: p.id,
        card_id: card.id,
        installment_number: idx + 1,
        installments_total: count,
        amount,
        invoice_month: `${inv.getFullYear()}-${String(inv.getMonth() + 1).padStart(2, "0")}-01`,
        status: "pendente",
      };
    });
    const { error: ie } = await supabase.from("credit_card_installments").insert(rows);
    if (ie) { toast.error("Erro ao gerar parcelas"); return; }
    toast.success(count > 1 ? `Compra parcelada em ${count}x criada!` : "Compra criada!");
    setPurchaseOpen(false);
    loadAll();
  };

  const deletePurchase = async (purchaseId: string) => {
    const { error } = await supabase.from("credit_card_purchases").delete().eq("id", purchaseId);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Compra excluída!");
    loadAll();
  };

  // ===== Derived state =====
  const selectedCard = cards.find(c => c.id === selectedCardId) || null;
  const invoiceKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;

  const cardSummaries = useMemo(() => {
    return cards.map(c => {
      const pendingFuture = installments.filter(i => i.card_id === c.id && i.status === "pendente");
      const used = pendingFuture.reduce((s, i) => s + Number(i.amount), 0);
      const available = Math.max(0, Number(c.limit_total) - used);
      const today = new Date();
      const currentInvoiceKey = invoiceKey(new Date(today.getFullYear(), today.getMonth(), 1));
      const currentInvoiceTotal = installments
        .filter(i => i.card_id === c.id && i.invoice_month.startsWith(currentInvoiceKey.slice(0, 7)))
        .reduce((s, i) => s + Number(i.amount), 0);
      const lowLimit = c.limit_total > 0 && available / Number(c.limit_total) < 0.1;
      return { card: c, used, available, currentInvoiceTotal, lowLimit };
    });
  }, [cards, installments]);

  const invoiceInstallments = useMemo(() => {
    if (!selectedCard) return [] as (Installment & { purchase: Purchase | undefined })[];
    const key = invoiceKey(invoiceMonth).slice(0, 7);
    return installments
      .filter(i => i.card_id === selectedCard.id && i.invoice_month.startsWith(key))
      .map(i => ({ ...i, purchase: purchases.find(p => p.id === i.purchase_id) }))
      .sort((a, b) => (a.purchase?.purchase_date || "").localeCompare(b.purchase?.purchase_date || ""));
  }, [selectedCard, invoiceMonth, installments, purchases]);

  const invoiceTotal = invoiceInstallments.reduce((s, i) => s + Number(i.amount), 0);
  const invoiceAllPaid = invoiceInstallments.length > 0 && invoiceInstallments.every(i => i.status === "pago");

  const payInvoice = async () => {
    if (!selectedCard || invoiceInstallments.length === 0) return;
    setPayConfirm({ total: invoiceTotal, due: dueDate(invoiceMonth, selectedCard.due_day) });
  };

  const confirmPayInvoice = async () => {
    if (!selectedCard || !payConfirm) return;
    // Ensure category exists
    const catName = "Cartão de Crédito";
    const hasCat = categories.some(c => c.name === catName && c.type === "despesa");
    if (!hasCat) {
      await supabase.from("financas_pessoais_categorias").insert({ user_id: user!.id, name: catName, type: "despesa" });
    }
    const dateStr = `${payConfirm.due.getFullYear()}-${String(payConfirm.due.getMonth() + 1).padStart(2, "0")}-${String(payConfirm.due.getDate()).padStart(2, "0")}`;
    const { error } = await supabase.from("financas_pessoais").insert({
      user_id: user!.id,
      type: "despesa",
      category: catName,
      description: `Fatura ${selectedCard.name} - ${monthLabel(invoiceMonth)}`,
      amount: payConfirm.total,
      date: dateStr,
      status: "pago",
      payment_method: "cartao_credito",
      paid_at: new Date(dateStr + "T12:00:00").toISOString(),
    });
    if (error) { toast.error("Erro ao registrar pagamento"); return; }
    // Mark installments as paid
    const ids = invoiceInstallments.map(i => i.id);
    await supabase.from("credit_card_installments").update({ status: "pago", paid_at: new Date().toISOString() }).in("id", ids);
    toast.success("Fatura paga e lançamento criado em Finanças Pessoal!");
    setPayConfirm(null);
    loadAll();
  };

  // ===== Render =====
  if (selectedCard) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedCardId(null)}><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Button>
          <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewPurchase}><Plus className="h-4 w-4 mr-1" /> Nova Compra</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova compra — {selectedCard.name}</DialogTitle></DialogHeader>
              <form onSubmit={savePurchase} className="space-y-4">
                <div className="space-y-2"><Label>Descrição</Label><Input value={purchaseForm.description} onChange={e => setPurchaseForm({ ...purchaseForm, description: e.target.value })} required maxLength={120} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valor total (R$)</Label><Input type="number" step="0.01" value={purchaseForm.amount_total} onChange={e => setPurchaseForm({ ...purchaseForm, amount_total: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Data da compra</Label><Input type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={purchaseForm.category} onValueChange={(v) => setPurchaseForm({ ...purchaseForm, category: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Parcelas</Label>
                    <Select value={purchaseForm.installments_count} onValueChange={(v) => setPurchaseForm({ ...purchaseForm, installments_count: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="1">À vista</SelectItem>
                        {Array.from({ length: 23 }, (_, i) => i + 2).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {parseInt(purchaseForm.installments_count) > 1 && parseFloat(purchaseForm.amount_total) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {purchaseForm.installments_count}x de {fmt(parseFloat(purchaseForm.amount_total) / parseInt(purchaseForm.installments_count))}
                  </p>
                )}
                <Button type="submit" className="w-full">Salvar compra</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Card visual */}
        <div className="rounded-2xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${selectedCard.color}, ${selectedCard.color}cc)` }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs opacity-80">Cartão</p>
              <h2 className="text-2xl font-bold">{selectedCard.name}</h2>
              <p className="text-sm opacity-90 mt-1">{selectedCard.brand}</p>
            </div>
            <CreditCard className="h-8 w-8 opacity-80" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="opacity-80 text-xs">Limite total</p>
              <p className="font-semibold">{fmt(Number(selectedCard.limit_total))}</p>
            </div>
            <div>
              <p className="opacity-80 text-xs">Disponível</p>
              <p className="font-semibold">{fmt(cardSummaries.find(s => s.card.id === selectedCard.id)?.available || 0)}</p>
            </div>
            <div>
              <p className="opacity-80 text-xs">Fechamento / Vencimento</p>
              <p className="font-semibold">dia {selectedCard.closing_day} / dia {selectedCard.due_day}</p>
            </div>
          </div>
        </div>

        {/* Invoice navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setInvoiceMonth(addMonths(invoiceMonth, -1))}><ChevronLeft className="h-4 w-4" /></Button>
              <div className="text-center">
                <CardTitle className="capitalize">Fatura — {monthLabel(invoiceMonth)}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Vencimento: {dueDate(invoiceMonth, selectedCard.due_day).toLocaleDateString("pt-BR")}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setInvoiceMonth(addMonths(invoiceMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {invoiceInstallments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem lançamentos nesta fatura</p>
            ) : (
              <div className="space-y-2">
                {invoiceInstallments.map(i => (
                  <div key={i.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{i.purchase?.description || "Compra"}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.purchase ? new Date(i.purchase.purchase_date + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                        {i.installments_total > 1 && ` · Parcela ${i.installment_number}/${i.installments_total}`}
                        {i.purchase?.category && ` · ${i.purchase.category}`}
                        {i.status === "pago" && " · ✓ Pago"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{fmt(Number(i.amount))}</span>
                      {i.installment_number === 1 && i.purchase && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deletePurchase(i.purchase!.id)} title="Excluir compra e todas as parcelas">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t mt-3">
                  <p className="font-semibold">Total da fatura</p>
                  <p className="text-lg font-bold">{fmt(invoiceTotal)}</p>
                </div>
                {!invoiceAllPaid && (
                  <Button className="w-full mt-3" onClick={payInvoice}>Marcar fatura como paga</Button>
                )}
                {invoiceAllPaid && (
                  <p className="text-center text-sm text-emerald-600 font-medium mt-2">Fatura paga ✓</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!payConfirm} onOpenChange={(o) => !o && setPayConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar pagamento da fatura</AlertDialogTitle>
              <AlertDialogDescription>
                Será criado um lançamento de despesa de <strong>{payConfirm ? fmt(payConfirm.total) : ""}</strong> no Finanças Pessoal na categoria "Cartão de Crédito".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmPayInvoice}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Cartões</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus cartões de crédito pessoais, compras e faturas.</p>
        </div>
        <Dialog open={cardOpen} onOpenChange={setCardOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewCard}><Plus className="h-4 w-4 mr-1" /> Adicionar Cartão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingCard ? "Editar cartão" : "Novo cartão"}</DialogTitle></DialogHeader>
            <form onSubmit={saveCard} className="space-y-4">
              <div className="space-y-2"><Label>Nome do cartão</Label><Input value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} placeholder="Ex: Nubank Roxinho" required maxLength={60} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bandeira</Label>
                  <Select value={cardForm.brand} onValueChange={(v) => setCardForm({ ...cardForm, brand: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Limite total (R$)</Label><Input type="number" step="0.01" value={cardForm.limit_total} onChange={e => setCardForm({ ...cardForm, limit_total: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Dia de fechamento</Label><Input type="number" min={1} max={31} value={cardForm.closing_day} onChange={e => setCardForm({ ...cardForm, closing_day: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Dia de vencimento</Label><Input type="number" min={1} max={31} value={cardForm.due_day} onChange={e => setCardForm({ ...cardForm, due_day: e.target.value })} required /></div>
              </div>
              <div className="space-y-2">
                <Label>Cor de identificação</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setCardForm({ ...cardForm, color: c })} className={`w-8 h-8 rounded-full border-2 transition ${cardForm.color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">{editingCard ? "Salvar alterações" : "Criar cartão"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {cards.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum cartão cadastrado. Clique em "Adicionar Cartão" para começar.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardSummaries.map(({ card, used, available, currentInvoiceTotal, lowLimit }) => {
            const pct = card.limit_total > 0 ? (used / Number(card.limit_total)) * 100 : 0;
            return (
              <div key={card.id} className="relative group">
                <button onClick={() => setSelectedCardId(card.id)} className="w-full text-left rounded-2xl p-5 text-white shadow-md hover:shadow-xl transition-shadow" style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs opacity-80">{card.brand}</p>
                      <h3 className="text-lg font-bold mt-0.5">{card.name}</h3>
                    </div>
                    <CreditCard className="h-6 w-6 opacity-80" />
                  </div>
                  <div className="mt-6 space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs opacity-90 mb-1">
                        <span>Limite usado</span>
                        <span>{fmt(used)} / {fmt(Number(card.limit_total))}</span>
                      </div>
                      <Progress value={Math.min(100, pct)} className="h-1.5 bg-white/20" />
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1">
                      <div>
                        <p className="opacity-80 text-xs">Disponível</p>
                        <p className="font-semibold">{fmt(available)}</p>
                      </div>
                      <div className="text-right">
                        <p className="opacity-80 text-xs">Fatura atual</p>
                        <p className="font-semibold">{fmt(currentInvoiceTotal)}</p>
                      </div>
                    </div>
                    {lowLimit && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs bg-red-500/30 border border-red-300/40 rounded-md px-2 py-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Limite disponível abaixo de 10%</span>
                      </div>
                    )}
                  </div>
                </button>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditCard(card); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDeletingCard(card); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deletingCard} onOpenChange={(o) => !o && setDeletingCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai remover o cartão "{deletingCard?.name}" e todas as compras e parcelas vinculadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
