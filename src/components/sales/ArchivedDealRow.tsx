import { Archive, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ArchivedDealSummary {
  id: string;
  title: string;
  value: number;
  closed_at: string | null;
  archived_at: string | null;
  clients?: { name: string } | null;
  service_orders?: { completed_at: string | null }[] | null;
}

interface ArchivedDealRowProps {
  deal: ArchivedDealSummary;
  onOpenDetails: (dealId: string) => void;
}

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

const formatCurrency = (value: number | null | undefined) => {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function ArchivedDealRow({ deal, onOpenDetails }: ArchivedDealRowProps) {
  const completionDate = deal.service_orders?.find((order) => order.completed_at)?.completed_at ?? null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={() => onOpenDetails(deal.id)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left transition-opacity hover:opacity-80"
      >
        <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
          <Archive className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{deal.title}</p>
            <Badge variant="outline">Arquivado</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{deal.clients?.name || "Sem cliente"}</span>
            <span>Fechamento: {formatDateTime(deal.closed_at)}</span>
            <span>Conclusão: {formatDateTime(completionDate)}</span>
            <span>Valor: {formatCurrency(deal.value)}</span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 sm:justify-end">
        <Button variant="ghost" size="sm" onClick={() => onOpenDetails(deal.id)}>
          <FileText className="h-4 w-4" />
          Histórico
        </Button>
        <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Arquivo: {formatDateTime(deal.archived_at)}</span>
        </div>
      </div>
    </div>
  );
}