import { Archive, Clock3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderSummary {
  id: string;
  title: string;
  status: string;
  completed_at: string | null;
  clients?: { name: string } | null;
  deals?: { value: number | null } | null;
}

interface ArchivedOrderRowProps {
  order: OrderSummary;
  autoArchived: boolean;
  onArchive: (orderId: string) => void;
  onOpenDetails: (orderId: string) => void;
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

export function ArchivedOrderRow({ order, autoArchived, onArchive, onOpenDetails }: ArchivedOrderRowProps) {
  const isArchived = order.status === "arquivado" || autoArchived;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={() => onOpenDetails(order.id)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left transition-opacity hover:opacity-80"
      >
        <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
          {isArchived ? <Archive className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{order.title}</p>
            <Badge variant="outline">{isArchived ? "Arquivada" : "Concluída"}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{order.clients?.name || "Sem cliente"}</span>
            <span>Conclusão: {formatDateTime(order.completed_at)}</span>
            <span>Valor: {formatCurrency(order.deals?.value)}</span>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 sm:justify-end">
        {!isArchived && (
          <Button variant="outline" size="sm" onClick={() => onArchive(order.id)}>
            <Archive className="h-4 w-4" />
            Arquivar
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onOpenDetails(order.id)}>
          <FileText className="h-4 w-4" />
          Resumo
        </Button>
      </div>
    </div>
  );
}