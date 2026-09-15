import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, FileCheck2 } from "lucide-react";
import gerirMaisLogo from "@/assets/logo-completa.png";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export interface DeliveryChecklistItem {
  id: string;
  title: string;
  completed: boolean | null;
  due_date?: string | null;
}

export interface DeliveryOrder {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at?: string | null;
  clients?: {
    name: string;
    trade_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  deals?: { value: number | null; title?: string | null; notes?: string | null } | null;
  checklist?: DeliveryChecklistItem[];
}

interface DeliveryReceiptProps {
  open: boolean;
  order: DeliveryOrder | null;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (value: string | null | undefined, withTime = false) => {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  return new Date(normalized).toLocaleString("pt-BR", withTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "short" });
};

const formatCurrency = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const loadImageAsDataUrl = async (src: string): Promise<string> => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    image.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem");
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
};

const safeFilename = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

export function DeliveryReceipt({ open, order, onOpenChange }: DeliveryReceiptProps) {
  const { profile } = useAuth();
  const { plan } = usePlan();
  const starter = plan === "starter";
  const [showGerirMais, setShowGerirMais] = useState(true);
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!order || !profile || generating) return;
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      let businessLogoLoaded = false;
      if (profile.logo_url) {
        try {
          const logo = await loadImageAsDataUrl(profile.logo_url);
          doc.addImage(logo, "PNG", margin, y, 25, 25, undefined, "FAST");
          businessLogoLoaded = true;
        } catch {
          // O documento continua válido quando a logo externa estiver indisponível.
        }
      }

      const businessX = businessLogoLoaded ? margin + 30 : margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(31, 41, 55);
      doc.text(profile.business_name || "Meu Negócio", businessX, y + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const businessLines = [
        profile.fiscal_document ? `CNPJ/CPF: ${profile.fiscal_document}` : "",
        profile.commercial_email || "",
        profile.whatsapp ? `WhatsApp: ${profile.whatsapp}` : "",
        [profile.street, profile.number, profile.complement, profile.neighborhood, profile.city, profile.state]
          .filter(Boolean).join(", "),
      ].filter(Boolean);
      businessLines.forEach((line, index) => doc.text(line, businessX, y + 13 + index * 4));

      y += 32;
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pageWidth - margin, y);
      y += 9;

      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("COMPROVANTE DE ENTREGA", margin, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Ordem de serviço: ${order.title}`, margin, y);
      y += 9;

      const client = order.clients;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DADOS DO CLIENTE", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Nome: ${client?.name || "Não informado"}`, margin, y);
      y += 4;
      if (client?.trade_name) { doc.text(`Empresa: ${client.trade_name}`, margin, y); y += 4; }
      if (client?.phone) { doc.text(`Telefone: ${client.phone}`, margin, y); y += 4; }
      if (client?.email) { doc.text(`E-mail: ${client.email}`, margin, y); y += 4; }
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DADOS DA ENTREGA", margin, y);
      y += 3;
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Criação", "Prazo", "Conclusão", "Status", "Valor"]],
        body: [[
          formatDate(order.created_at),
          formatDate(order.due_date),
          formatDate(order.completed_at, true),
          order.status === "arquivado" ? "Arquivada" : order.status === "concluido" ? "Concluída" : "Em andamento",
          formatCurrency(order.deals?.value),
        ]],
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("SERVIÇOS EXECUTADOS", margin, y);
      y += 3;
      const checklist = order.checklist || [];
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Item", "Prazo", "Situação"]],
        body: checklist.length
          ? checklist.map((item) => [item.title, formatDate(item.due_date), item.completed ? "Concluído" : "Pendente"])
          : [["Nenhum item registrado", "—", "—"]],
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [71, 85, 105], textColor: 255 },
        columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 } },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

      if (order.deals?.notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("OBSERVAÇÕES", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(order.deals.notes, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 4 + 7;
      }

      if (y > pageHeight - 62) { doc.addPage(); y = margin + 5; }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Declaro que recebi e conferi os serviços descritos neste comprovante.", margin, y);
      y += 18;
      const signatureWidth = 78;
      doc.line(margin, y, margin + signatureWidth, y);
      doc.line(pageWidth - margin - signatureWidth, y, pageWidth - margin, y);
      doc.setFontSize(8);
      doc.text(client?.name || "Cliente", margin, y + 5);
      doc.text("Data", pageWidth - margin - signatureWidth, y + 5);

      const includeBranding = starter || showGerirMais;
      let brandLogo: string | null = null;
      if (includeBranding) {
        try { brandLogo = await loadImageAsDataUrl(gerirMaisLogo); } catch { brandLogo = null; }
      }
      const pages = doc.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        const footerY = pageHeight - 7;
        doc.text([profile.business_name, profile.whatsapp, profile.commercial_email].filter(Boolean).join(" | "), margin, footerY);
        if (includeBranding) {
          if (brandLogo) doc.addImage(brandLogo, "PNG", pageWidth / 2 - 10, footerY - 4.5, 16, 5, undefined, "FAST");
          doc.text("Gerado por Gerir+", pageWidth / 2 + (brandLogo ? 8 : 0), footerY, { align: brandLogo ? "left" : "center" });
        }
        doc.text(`Página ${page} de ${pages}`, pageWidth - margin, footerY, { align: "right" });
      }

      doc.save(`entrega-${safeFilename(order.title) || order.id}.pdf`);
      toast.success("Comprovante de entrega gerado!");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível gerar o comprovante. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" />
            Comprovante de entrega
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <p className="font-medium">{order?.title}</p>
            <p className="text-sm text-muted-foreground">O PDF incluirá os dados do negócio, cliente, entrega e checklist.</p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <Label htmlFor="gerir-brand">Logo do Gerir+</Label>
              <p className="text-xs text-muted-foreground">
                {starter ? "Incluída no plano Starter" : "Exibir no rodapé do documento"}
              </p>
            </div>
            <Switch id="gerir-brand" checked={starter || showGerirMais} onCheckedChange={setShowGerirMais} disabled={starter} />
          </div>
          <Button className="w-full" onClick={generate} disabled={generating || !order}>
            <Download className="h-4 w-4" />
            {generating ? "Gerando..." : "Gerar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}