import { Check, X, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlan } from "@/hooks/usePlan";

interface PlanDef {
  key: "starter" | "pro" | "scale";
  name: string;
  tagline: string;
  price: string;
  period: string;
  highlighted?: boolean;
  checkoutUrl: string;
  features: { label: string; included: boolean }[];
}

// Substitua os checkoutUrl pelas URLs reais da Kiwify quando disponíveis
const PLANS: PlanDef[] = [
  {
    key: "starter",
    name: "Starter",
    tagline: "Para quem está começando",
    price: "R$ 27",
    period: "/mês",
    checkoutUrl: "https://pay.kiwify.com.br/8ymrxTU",
    features: [
      { label: "Dashboard", included: true },
      { label: "Finanças completo", included: true },
      { label: "Vendas (Kanban)", included: true },
      { label: "Operação (OS + checklist)", included: true },
      { label: "Proposta comercial em PDF", included: false },
      { label: "Histórico de atendimento", included: false },
      { label: "Marketing", included: false },
      { label: "Múltiplos usuários", included: false },
      { label: "Integração WhatsApp", included: false },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "Para profissionais que escalam",
    price: "R$ 47",
    period: "/mês",
    highlighted: true,
    checkoutUrl: "https://pay.kiwify.com.br/MGuRbSq",
    features: [
      { label: "Tudo do Starter", included: true },
      { label: "Proposta comercial em PDF", included: true },
      { label: "Histórico de atendimento do cliente", included: true },
      { label: "Marketing", included: true },
      { label: "Módulo Valor", included: true },
      { label: "Múltiplos usuários", included: false },
      { label: "Integração WhatsApp", included: false },
    ],
  },
  {
    key: "scale",
    name: "Scale",
    tagline: "Para times e operações maiores",
    price: "R$ 67",
    period: "/mês",
    checkoutUrl: "https://pay.kiwify.com.br/p9XksyB",
    features: [
      { label: "Tudo do Pro", included: true },
      { label: "Múltiplos usuários", included: true },
      { label: "Integração WhatsApp", included: true },
      { label: "Suporte prioritário", included: true },
    ],
  },
];

export default function Planos() {
  const { plan, isTrial, trialDaysLeft, status } = usePlan();

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold">Escolha o plano ideal para o seu negócio</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Comece pelo Starter ou desbloqueie todo o potencial do Gerir+ com Pro e Scale. Cancele quando quiser.
        </p>
        {isTrial && (
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm">
            <Sparkles className="h-4 w-4" />
            Você está no período gratuito — {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((p) => {
          const isCurrent = !isTrial && status === "ativo" && plan === p.key;
          return (
            <Card key={p.key} className={`relative ${p.highlighted ? "border-primary shadow-lg scale-[1.02]" : ""}`}>
              {p.highlighted && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Mais popular</Badge>}
              <CardHeader>
                <CardTitle className="text-2xl">{p.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{p.tagline}</p>
                <div className="pt-3">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-sm">
                      {f.included ? (
                        <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                      )}
                      <span className={f.included ? "" : "text-muted-foreground/60 line-through"}>{f.label}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full" variant={p.highlighted ? "default" : "outline"} disabled={isCurrent}>
                  <a href={p.checkoutUrl} target="_blank" rel="noopener noreferrer">
                    {isCurrent ? "Plano atual" : `Assinar ${p.name}`}
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Pagamentos processados com segurança via Kiwify. Após a confirmação do pagamento, seu plano é ativado
          automaticamente.
        </CardContent>
      </Card>
    </div>
  );
}
