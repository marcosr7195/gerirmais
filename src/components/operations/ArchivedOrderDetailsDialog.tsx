import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean | null;
}

interface ServiceOrderDetails {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  created_at?: string | null;
  clients?: { name: string } | null;
  deals?: { value: number | null; title?: string | null } | null;
  checklist?: ChecklistItem[];
}

interface ArchivedOrderDetailsDialogProps {
  open: boolean;
  order: ServiceOrderDetails | null;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: value.includes("T") ? "short" : undefined,
  });
};

const formatCurrency = (value: number | null | undefined) => {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export function ArchivedOrderDetailsDialog({ open, order, onOpenChange }: ArchivedOrderDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resumo da ordem de serviço</DialogTitle>
        </DialogHeader>

        {order && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{order.title}</h2>
                <Badge variant="outline">{order.status === "arquivado" ? "Arquivada" : "Concluída"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {order.clients?.name || "Sem cliente"}
                {order.deals?.title ? ` · ${order.deals.title}` : ""}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Criada em</p>
                <p className="font-medium">{formatDate(order.created_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Prazo</p>
                <p className="font-medium">{formatDate(order.due_date)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Conclusão</p>
                <p className="font-medium">{formatDate(order.completed_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="font-medium">{formatCurrency(order.deals?.value)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium">Checklist executado</h3>
              {order.checklist?.length ? (
                <div className="space-y-2">
                  {order.checklist.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span>{item.title}</span>
                      <Badge variant="outline">{item.completed ? "Concluído" : "Pendente"}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum item registrado.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}