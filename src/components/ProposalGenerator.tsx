import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, Download, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProposalItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Client {
  id: string; name: string; email: string | null; phone: string | null;
  document: string | null; person_type: string | null;
  zip_code: string | null; street: string | null; number: string | null;
  complement: string | null; neighborhood: string | null; city: string | null; state: string | null;
}

interface Deal {
  id: string; title: string; value: number; client_id: string | null;
  fixed_value: boolean; clients?: Client | null; items?: { description: string; quantity: number; unit_price: number }[];
}

interface Proposal {
  id: string;
  proposal_number: string;
  issue_date: string;
  total_value: number;
  created_at: string;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ProposalGenerator({ deal, open, onOpenChange }: { deal: Deal; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user, profile } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [isFixed, setIsFixed] = useState(deal.fixed_value);
  const [items, setItems] = useState<ProposalItem[]>(
    deal.items && deal.items.length > 0
      ? deal.items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price }))
      : [{ description: "", quantity: 1, unit_price: 0 }]
  );
  const [fixedTotal, setFixedTotal] = useState(deal.value || 0);
  const [validityDays, setValidityDays] = useState(15);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentCondition, setPaymentCondition] = useState("a_vista");
  const [installments, setInstallments] = useState(1);
  const [deliveryDeadline, setDeliveryDeadline] = useState("");
  const [observations, setObservations] = useState("");
  const [acceptanceText, setAcceptanceText] = useState("Ao aprovar esta proposta o cliente concorda com os termos e condições descritos acima.");

  useEffect(() => {
    if (open && user) loadProposals();
  }, [open, user]);

  const loadProposals = async () => {
    const { data } = await supabase
      .from("proposals")
      .select("id, proposal_number, issue_date, total_value, created_at")
      .eq("deal_id", deal.id)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setProposals((data as Proposal[]) || []);
  };

  const getNextNumber = async (): Promise<string> => {
    const { count } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id);
    const n = (count || 0) + 1;
    return `PROP-${String(n).padStart(3, "0")}`;
  };

  const calcTotal = () => isFixed ? fixedTotal : items.reduce((a, i) => a + i.quantity * i.unit_price, 0);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ProposalItem, val: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = val;
    setItems(updated);
  };

  const generatePDF = async (save = true) => {
    if (!profile || !user) return;

    const total = calcTotal();
    const client = deal.clients;
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + validityDays);
    const proposalNumber = await getNextNumber();
    const issueDate = new Date().toLocaleDateString("pt-BR");
    const validityStr = validityDate.toLocaleDateString("pt-BR");

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // --- HEADER ---
    // Try to load logo
    let logoLoaded = false;
    if (profile.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = profile.logo_url!;
        });
        doc.addImage(img, "JPEG", margin, y, 25, 25);
        logoLoaded = true;
      } catch {}
    }

    const headerX = logoLoaded ? margin + 30 : margin;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(profile.business_name || "Meu Negócio", headerX, y + 8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const headerLines: string[] = [];
    if (profile.fiscal_document) headerLines.push(profile.fiscal_document);
    if (profile.commercial_email) headerLines.push(profile.commercial_email);
    if (profile.whatsapp) headerLines.push(`WhatsApp: ${profile.whatsapp}`);
    const addr = [profile.street, profile.number, profile.neighborhood, profile.city, profile.state].filter(Boolean).join(", ");
    if (addr) headerLines.push(addr);
    headerLines.forEach((line, i) => {
      doc.text(line, headerX, y + 14 + i * 4);
    });
    doc.setTextColor(0);

    y = Math.max(y + 30, y + 14 + headerLines.length * 4 + 5);
    doc.setDrawColor(200);
    doc.line(margin, y, pw - margin, y);
    y += 8;

    // --- PROPOSAL INFO ---
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Proposta Comercial ${proposalNumber}`, margin, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Data de emissão: ${issueDate}`, margin, y);
    doc.text(`Válida até: ${validityStr}`, pw / 2, y);
    y += 10;

    // --- CLIENT ---
    if (client) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DADOS DO CLIENTE", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(client.name, margin, y); y += 4;
      if (client.document) { doc.text(`Documento: ${client.document}`, margin, y); y += 4; }
      if (client.email) { doc.text(`Email: ${client.email}`, margin, y); y += 4; }
      if (client.phone) { doc.text(`WhatsApp: ${client.phone}`, margin, y); y += 4; }
      const cAddr = [client.street, client.number, client.neighborhood, client.city, client.state].filter(Boolean).join(", ");
      if (cAddr) { doc.text(cAddr, margin, y); y += 4; }
      y += 4;
    }

    // --- SERVICES TABLE ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ESCOPO DOS SERVIÇOS", margin, y);
    y += 3;

    if (isFixed) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Descrição", "Valor Total"]],
        body: [[deal.title, fmt(fixedTotal)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    } else {
      const tableBody = items.filter(i => i.description.trim()).map(i => [
        i.description,
        String(i.quantity),
        fmt(i.unit_price),
        fmt(i.quantity * i.unit_price),
      ]);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Descrição", "Qtd", "Valor Unit.", "Valor Total"]],
        body: tableBody,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    y = (doc as any).lastAutoTable.finalY + 5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${fmt(total)}`, pw - margin, y, { align: "right" });
    y += 10;

    // --- PAYMENT ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CONDIÇÕES COMERCIAIS", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const methodLabels: Record<string, string> = { pix: "PIX", transferencia: "Transferência", boleto: "Boleto", cartao: "Cartão", outro: "Outro" };
    const condLabels: Record<string, string> = { a_vista: "À vista", parcelado: `Parcelado em ${installments}x`, recorrente: "Recorrente mensal" };

    doc.text(`Forma de pagamento: ${methodLabels[paymentMethod] || paymentMethod}`, margin, y); y += 4;
    doc.text(`Condição: ${condLabels[paymentCondition] || paymentCondition}`, margin, y); y += 4;
    if (deliveryDeadline) { doc.text(`Prazo de início/entrega: ${deliveryDeadline}`, margin, y); y += 4; }

    // Bank info
    if (profile.bank_name || profile.pix_key) {
      y += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Dados bancários:", margin, y); y += 4;
      doc.setFont("helvetica", "normal");
      if (profile.bank_name) { doc.text(`Banco: ${profile.bank_name}`, margin, y); y += 4; }
      if (profile.agency) { doc.text(`Agência: ${profile.agency} | Conta: ${profile.account_number || ""}`, margin, y); y += 4; }
      if (profile.pix_key) { doc.text(`Chave PIX: ${profile.pix_key}`, margin, y); y += 4; }
      if (profile.account_holder) { doc.text(`Titular: ${profile.account_holder}`, margin, y); y += 4; }
    }
    y += 5;

    // --- OBSERVATIONS ---
    if (observations.trim()) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("OBSERVAÇÕES", margin, y); y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const obsLines = doc.splitTextToSize(observations, pw - margin * 2);
      doc.text(obsLines, margin, y);
      y += obsLines.length * 4 + 5;
    }

    // --- ACCEPTANCE ---
    if (y > 250) { doc.addPage(); y = margin; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ACEITE", margin, y); y += 5;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    const acceptLines = doc.splitTextToSize(acceptanceText, pw - margin * 2);
    doc.text(acceptLines, margin, y);
    y += acceptLines.length * 4 + 15;

    // Signature lines
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const sigW = (pw - margin * 2 - 20) / 2;
    doc.line(margin, y, margin + sigW, y);
    doc.text(profile.business_name || "Contratada", margin, y + 5);
    doc.line(margin + sigW + 20, y, pw - margin, y);
    doc.text(client?.name || "Contratante", margin + sigW + 20, y + 5);

    // --- FOOTER ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text(`${profile.business_name || ""} | ${profile.whatsapp || ""} | ${profile.commercial_email || ""}`, pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
      doc.text(`Página ${i} de ${pageCount}`, pw - margin, doc.internal.pageSize.getHeight() - 8, { align: "right" });
      doc.setTextColor(0);
    }

    if (save) {
      // Save to DB
      const bankInfo = {
        bank_name: profile.bank_name, agency: profile.agency,
        account_number: profile.account_number, pix_key: profile.pix_key,
        account_holder: profile.account_holder, account_type: profile.account_type,
      };
      const businessInfo = {
        name: profile.business_name, document: profile.fiscal_document,
        email: profile.commercial_email, whatsapp: profile.whatsapp,
        logo_url: profile.logo_url,
      };
      const clientInfo = client ? {
        name: client.name, document: client.document,
        email: client.email, phone: client.phone,
      } : null;

      await supabase.from("proposals").insert({
        user_id: user!.id,
        deal_id: deal.id,
        client_id: deal.client_id,
        proposal_number: proposalNumber,
        validity_date: validityDate.toISOString().slice(0, 10),
        payment_method: paymentMethod,
        payment_condition: paymentCondition,
        installments,
        delivery_deadline: deliveryDeadline || null,
        items: isFixed ? [{ description: deal.title, quantity: 1, unit_price: fixedTotal }] : items.filter(i => i.description.trim()),
        fixed_value: isFixed,
        total_value: total,
        observations: observations || null,
        acceptance_text: acceptanceText,
        bank_info: bankInfo,
        business_info: businessInfo,
        client_info: clientInfo,
      } as any);

      await loadProposals();
      toast.success(`Proposta ${proposalNumber} gerada!`);
      setShowForm(false);
    }

    doc.save(`${proposalNumber}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Propostas — {deal.title}
          </DialogTitle>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nova Proposta
            </Button>

            {proposals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma proposta gerada para este negócio</p>
            ) : (
              <div className="space-y-2">
                {proposals.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium text-sm">{p.proposal_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.issue_date).toLocaleDateString("pt-BR")} · {fmt(Number(p.total_value))}
                      </p>
                    </div>
                    <Badge variant="secondary">Gerada</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Scope */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Escopo dos Serviços</h3>
              <div className="flex items-center gap-3">
                <Switch checked={isFixed} onCheckedChange={setIsFixed} />
                <Label>Valor fixo</Label>
              </div>
              {isFixed ? (
                <div className="space-y-2">
                  <Label>Valor total</Label>
                  <Input type="number" step="0.01" value={fixedTotal} onChange={(e) => setFixedTotal(Number(e.target.value))} />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                    <span className="col-span-5">Descrição</span>
                    <span className="col-span-2">Qtd</span>
                    <span className="col-span-3">Valor Unit.</span>
                    <span className="col-span-1">Total</span>
                    <span className="col-span-1"></span>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-5" placeholder="Descrição" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                      <Input className="col-span-2" type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} />
                      <Input className="col-span-3" type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} />
                      <span className="col-span-1 text-xs font-medium">{fmt(item.quantity * item.unit_price)}</span>
                      {items.length > 1 && (
                        <Button variant="ghost" size="sm" className="col-span-1 h-8 w-8 p-0" onClick={() => removeItem(i)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar item
                  </Button>
                  <p className="text-sm font-semibold">Subtotal: {fmt(calcTotal())}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Payment */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Condições Comerciais</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Condição</Label>
                  <Select value={paymentCondition} onValueChange={setPaymentCondition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_vista">À vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                      <SelectItem value="recorrente">Recorrente mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {paymentCondition === "parcelado" && (
                <div className="space-y-2">
                  <Label>Número de parcelas</Label>
                  <Input type="number" min={2} value={installments} onChange={(e) => setInstallments(Number(e.target.value))} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Validade (dias)</Label>
                  <Input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Prazo de início/entrega</Label>
                  <Input value={deliveryDeadline} onChange={(e) => setDeliveryDeadline(e.target.value)} placeholder="Ex: 30 dias úteis" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Text */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Texto Complementar</h3>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Condições especiais, detalhes adicionais..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Texto de aceite</Label>
                <Textarea value={acceptanceText} onChange={(e) => setAcceptanceText(e.target.value)} rows={2} />
              </div>
            </div>

            <Separator />

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={() => generatePDF(true)} disabled={loading}>
                <Download className="h-4 w-4 mr-2" /> Gerar PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
