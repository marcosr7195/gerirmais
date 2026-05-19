import { Link } from "react-router-dom";
import {
  Check,
  TrendingUp,
  Users,
  ClipboardList,
  Wallet,
  Megaphone,
  DollarSign,
  AlertCircle,
  UserX,
  CalendarX,
  FileWarning,
  Instagram,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logoCompleta from "@/assets/logo-completa.png";

const PROBLEMAS = [
  { icon: Wallet, title: "Não sabe quanto dinheiro entra e sai", color: "text-destructive" },
  { icon: UserX, title: "Perde leads por falta de acompanhamento", color: "text-warning" },
  { icon: CalendarX, title: "Esquece prazos e entregas", color: "text-destructive" },
  { icon: FileWarning, title: "Não tem proposta profissional para enviar", color: "text-warning" },
];

const PILARES = [
  { icon: DollarSign, name: "Vitrine", desc: "Mostre seus serviços e produtos para os clientes.", soon: true },
  { icon: Megaphone, name: "Marketing", desc: "Atraia clientes com campanhas e canais integrados.", soon: true },
  { icon: TrendingUp, name: "Vendas", desc: "Kanban, propostas e histórico de cada cliente." },
  { icon: ClipboardList, name: "Entregáveis", desc: "Operação e execução dos serviços contratados." },
  { icon: Wallet, name: "Finanças", desc: "Receitas, despesas e fluxo de caixa em um só lugar." },
];

const PASSOS = [
  { n: "1", title: "Cadastre seu negócio em 2 minutos", desc: "Crie sua conta e configure os dados básicos." },
  { n: "2", title: "Organize clientes, serviços e finanças", desc: "Centralize todas as informações da operação." },
  { n: "3", title: "Acompanhe tudo no dashboard em tempo real", desc: "Tome decisões com dados sempre atualizados." },
];

const PLANOS = [
  {
    name: "Starter",
    price: "R$ 27",
    tagline: "Para quem está começando",
    url: "https://pay.kiwify.com.br/8ymrxTU",
    features: [
      "Finanças completo",
      "Vendas com Kanban",
      "Entregáveis com OS e checklist",
      "Dashboard",
      "Até 30 clientes",
    ],
  },
  {
    name: "Pro",
    price: "R$ 47",
    tagline: "Para profissionais que escalam",
    url: "https://pay.kiwify.com.br/MGuRbSq",
    badge: "MAIS POPULAR",
    highlighted: true,
    features: [
      "Tudo do Starter",
      "Clientes ilimitados",
      "Proposta em PDF",
      "Histórico de atendimento",
      "Marketing (em breve)",
      "Vitrine (em breve)",
    ],
  },
  {
    name: "Scale",
    price: "R$ 67",
    tagline: "Para times e operações maiores",
    url: "https://pay.kiwify.com.br/p9XksyB",
    badge: "COMPLETO",
    features: [
      "Tudo do Pro",
      "Até 3 usuários na conta",
      "WhatsApp integrado (em breve)",
      "Suporte prioritário",
    ],
  },
];

const DEPOIMENTOS = [
  {
    name: "Ana Paula Ferreira",
    role: "Designer Freelancer",
    avatar: "https://i.pravatar.cc/150?img=1",
    text: "Finalmente consegui organizar meus clientes e finanças em um só lugar. As propostas em PDF me poupam horas toda semana.",
  },
  {
    name: "Carlos Eduardo Lima",
    role: "Consultor de Marketing",
    avatar: "https://i.pravatar.cc/150?img=2",
    text: "O pipeline de vendas mudou minha forma de trabalhar. Não perco mais nenhum lead e sei exatamente em que etapa cada cliente está.",
  },
  {
    name: "Juliana Costa",
    role: "Personal Trainer",
    avatar: "https://i.pravatar.cc/150?img=3",
    text: "Uso o Gerir+ para controlar todos os meus alunos, pagamentos e sessões. Simples, rápido e funciona no celular.",
  },
];

const FAQ = [
  {
    q: "O que é o Gerir+?",
    a: "O Gerir+ é o sistema completo para o pequeno empresário gerenciar finanças, vendas e operações em um só lugar, com a simplicidade que você precisa para crescer de verdade.",
  },
  {
    q: "Como funciona o trial de 14 dias?",
    a: "Você cria sua conta sem precisar de cartão de crédito e tem acesso completo a todas as funcionalidades do plano Pro por 14 dias. Ao final do período, basta escolher um plano para continuar.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Não há fidelidade. Você pode cancelar diretamente pela área do assinante a qualquer momento, sem multas ou burocracia.",
  },
  {
    q: "Meus dados ficam salvos se eu cancelar?",
    a: "Seus dados ficam disponíveis por 30 dias após o cancelamento, caso você queira reativar a conta. Após esse período, são removidos com segurança.",
  },
  {
    q: "Como funciona o suporte?",
    a: "Todos os planos contam com suporte por email. O plano Scale tem suporte prioritário com tempo de resposta reduzido.",
  },
];

export default function Inicio() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/inicio" className="flex items-center gap-2">
            <img src={logoCompleta} alt="Gerir+" className="h-10 sm:h-12 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#funcionalidades" className="text-muted-foreground hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <a href="#planos" className="text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none z-0" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm">
              <Sparkles className="h-4 w-4" />
              14 dias grátis sem cartão de crédito
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              O sistema completo para seu negócio <span className="text-primary">crescer de verdade</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Gerencie finanças, vendas e operações em um só lugar — do jeito que o pequeno empresário precisa.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button size="lg" asChild className="text-base">
                <Link to="/auth">
                  Começar grátis por 14 dias
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base">
                <a href="#funcionalidades">Ver como funciona</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">Você se identifica com isso?</h2>
            <p className="text-muted-foreground">Os desafios que travam o crescimento do seu negócio.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {PROBLEMAS.map((p) => (
              <Card key={p.title} className="border-border/60">
                <CardContent className="p-6 space-y-3">
                  <div className={`w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center ${p.color}`}>
                    <p.icon className="h-5 w-5" />
                  </div>
                  <p className="font-medium text-sm leading-snug">{p.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUÇÃO — pilares */}
      <section id="funcionalidades" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <Badge variant="secondary">A solução</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Os 5 pilares do Gerir+</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Tudo que você precisa para gerir seu negócio em uma única plataforma.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {PILARES.map((p) => (
              <Card key={p.name} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.soon && (
                      <Badge variant="outline" className="text-xs">
                        Em breve
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
            Módulos <strong>Marketing</strong> e <strong>Valor</strong> chegam em breve — assinantes Pro e Scale terão
            acesso automático sem custo adicional.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">Como funciona</h2>
            <p className="text-muted-foreground">Em 3 passos seu negócio está no controle.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PASSOS.map((p) => (
              <div key={p.n} className="text-center space-y-3 p-6">
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto">
                  {p.n}
                </div>
                <h3 className="font-semibold text-lg">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <Badge variant="secondary">Planos</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Escolha o plano ideal</h2>
            <p className="text-muted-foreground">Comece grátis. Faça upgrade quando precisar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {PLANOS.map((p) => (
              <Card
                key={p.name}
                className={`relative ${p.highlighted ? "border-primary shadow-lg md:scale-[1.03]" : ""}`}
              >
                {p.badge && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{p.badge}</Badge>}
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h3 className="text-2xl font-bold">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.tagline}</p>
                  </div>
                  <div>
                    <span className="text-4xl font-bold">{p.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full" variant={p.highlighted ? "default" : "outline"}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      Assinar {p.name}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            Todos os planos incluem <strong>14 dias grátis sem cartão de crédito</strong>. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">O que dizem nossos clientes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {DEPOIMENTOS.map((d, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={d.avatar} alt={d.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {d.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{d.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold">Perguntas frequentes</h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center space-y-6 max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold">Pronto para começar?</h2>
          <p className="text-primary-foreground/90">
            Crie sua conta agora e tenha 14 dias gratuitos para testar tudo.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth">
              Começar grátis por 14 dias
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="space-y-3">
              <img src={logoCompleta} alt="Gerir+" className="h-12 w-auto object-contain" />
              <p className="text-sm text-muted-foreground">
                O sistema completo para o pequeno empresário gerir e crescer.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="text-muted-foreground inline-flex items-center gap-2">
                    Termos de Uso
                    <Badge variant="outline" className="text-[10px]">Em breve</Badge>
                  </span>
                </li>
                <li>
                  <span className="text-muted-foreground inline-flex items-center gap-2">
                    Política de Privacidade
                    <Badge variant="outline" className="text-[10px]">Em breve</Badge>
                  </span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Contato</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="mailto:contato@gerirmais.com.br"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    contato@gerirmais.com.br
                  </a>
                </li>
                <li>
                  <a
                    href="https://instagram.com/gerirmaisoficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
                  >
                    <Instagram className="h-4 w-4" />
                    @gerirmaisoficial
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-10 pt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Gerir+. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
