import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ProposalEntry {
  id: string;
  proposal_number: string;
  issue_date: string;
  total_value: number | null;
}

interface ArchivedInteraction {
  id: string;
  interaction_type: string;
  interaction_date: string;
  subject: string | null;
  summary: string | null;
  is_automatic: boolean;
}

interface ArchivedDealDetails {
  id: string;
  title: string;
  stage: string;
  value: number;
  notes: string | null;
  closed_at: string | null;
  archived_at: string | null;
  clients?: { name: string } | null;
  service_orders?: { id: string; title: string | null; completed_at: string | null; created_at?: string | null }[] | null;
  proposals?: ProposalEntry[] | null;
  interactions?: ArchivedInteraction[] | null;
}

interface ArchivedDealDetailsDialogProps {
  open: boolean;
  deal: ArchivedDealDetails | null;
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

const interactionLabels: Record<string, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "Email",
  reuniao: "Reunião",
  visita: "Visita",
  proposta: "Proposta",
  sistema: "Sistema",
  outro: "Outro",
};

export function ArchivedDealDetailsDialog({ open, deal, onOpenChange }: ArchivedDealDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico do negócio fechado</DialogTitle>
        </DialogHeader>

        {deal && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{deal.title}</h2>
                <Badge variant="outline">Arquivado</Badge>
                <Badge variant="secondary">{deal.clients?.name || "Sem cliente"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Consulta do histórico completo em modo leitura.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="font-medium">{formatCurrency(deal.value)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fechamento</p>
                <p className="font-medium">{formatDate(deal.closed_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Arquivamento</p>
                <p className="font-medium">{formatDate(deal.archived_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">OS concluída</p>
                <p className="font-medium">{formatDate(deal.service_orders?.find((order) => order.completed_at)?.completed_at)}</p>
              </div>
            </div>

            {deal.notes && (
              <div className="space-y-2 rounded-lg border border-border p-4">
                <h3 className="font-medium">Observações do negócio</h3>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{deal.notes}</p>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-border p-4">
                <h3 className="font-medium">Propostas geradas</h3>
                {deal.proposals?.length ? (
                  <div className="space-y-2">
                    {deal.proposals.map((proposal) => (
                      <div key={proposal.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{proposal.proposal_number}</p>
                          <p className="text-muted-foreground">Emissão: {formatDate(proposal.issue_date)}</p>
                        </div>
                        <span className="font-medium">{formatCurrency(proposal.total_value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma proposta vinculada.</p>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-border p-4">
                <h3 className="font-medium">Linha do tempo resumida</h3>
                {deal.interactions?.length ? (
                  <div className="space-y-2">
                    {deal.interactions.map((interaction) => (
                      <div key={interaction.id} className="rounded-md border border-border px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{interaction.subject || interactionLabels[interaction.interaction_type] || "Registro"}</p>
                          <Badge variant="outline">{interactionLabels[interaction.interaction_type] || interaction.interaction_type}</Badge>
                          {interaction.is_automatic && <Badge variant="secondary">Auto</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(interaction.interaction_date)}</p>
                        {interaction.summary && <p className="mt-1 text-muted-foreground">{interaction.summary}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}