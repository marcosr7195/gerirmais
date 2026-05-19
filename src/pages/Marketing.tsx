import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Megaphone, ArrowRight, Pencil } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { toast } from "sonner";

// ============ Tipos ============
interface Lead {
  id: string;
  name: string;
  origin: string | null;
  created_at: string;
  deal?: { stage: string; value: number | null } | null;
}

// ============ Funis ============
const FUNNELS = [
  {
    key: "indicacao",
    title: "Funil de Indicação",
    color: "bg-primary/10 text-primary border-primary/20",
    steps: [
      { name: "Cliente atual", copy: "Olá {cliente}! Aqui é da {negocio}. Espero que esteja tudo bem com o serviço de {servico} que entregamos. Você está satisfeito(a)?" },
      { name: "Pedir indicação", copy: "Que bom saber que você está satisfeito(a)! Posso pedir um favor? Você conhece alguém que também precisaria de {servico}? Sua indicação vale muito para a {negocio}." },
      { name: "Novo lead chega", copy: "Olá! O(a) {cliente_indicador} me passou seu contato e disse que você está procurando por {servico}. Sou da {negocio} e ficaria feliz em te ajudar." },
      { name: "Abordagem", copy: "Para eu te ajudar da melhor forma, me conta rapidinho: qual é a sua maior necessidade hoje em relação a {servico}? Assim consigo preparar algo sob medida pra você." },
      { name: "Proposta", copy: "Com base no que conversamos, preparei uma proposta personalizada de {servico} para você. Estou enviando o documento agora. Qualquer dúvida me chama!" },
      { name: "Fechamento", copy: "Que ótimo que vamos fechar! Vou já dar início ao processo. Como o(a) {cliente_indicador} te indicou, vou aplicar uma condição especial. Obrigado pela confiança na {negocio}!" },
    ],
  },
  {
    key: "redes",
    title: "Funil de Redes Sociais",
    color: "bg-warning/10 text-warning border-warning/20",
    steps: [
      { name: "Post ou conteúdo", copy: "Você sabia que {servico} pode transformar o seu resultado? Aqui na {negocio} ajudamos pessoas como você todos os dias. Comenta aqui 'EU QUERO' que te mando mais informações!" },
      { name: "Comentário ou DM", copy: "Oii! Vi seu comentário/DM e fiquei feliz com seu interesse. Sou da {negocio}. Me conta um pouco sobre o que você precisa de {servico}?" },
      { name: "Qualificação", copy: "Entendi! Para eu te passar a melhor solução: há quanto tempo você está buscando isso? Já tentou algo antes? E qual seria seu orçamento ideal?" },
      { name: "Proposta", copy: "Com base no que você me contou, preparei uma proposta sob medida de {servico}. Vou te enviar o material completo agora pra você analisar com calma." },
      { name: "Fechamento", copy: "Perfeito! Vamos fechar então. Vou te enviar os dados de pagamento e o passo a passo de como vamos começar. Bem-vindo(a) à {negocio}!" },
    ],
  },
  {
    key: "reativacao",
    title: "Funil de Reativação",
    color: "bg-secondary/30 text-foreground border-secondary",
    steps: [
      { name: "Cliente antigo", copy: "Oi {cliente}! Aqui é da {negocio}. Faz um tempinho que não conversamos. Como você está? Lembrei de você hoje e quis te dar um alô." },
      { name: "Mensagem de reativação", copy: "Estamos com novidades por aqui em {servico} e lembrei que pode te interessar. Posso te contar mais sobre o que mudou?" },
      { name: "Oferta especial", copy: "Como você já é cliente da {negocio}, separei uma condição exclusiva para você voltar: uma oferta especial em {servico} válida só esta semana. Quer ver os detalhes?" },
      { name: "Proposta", copy: "Aqui está sua proposta personalizada de {servico} com a condição especial de cliente. Dá uma olhada e me fala o que achou!" },
      { name: "Fechamento", copy: "Que alegria ter você de volta na {negocio}! Vou organizar tudo para começarmos o quanto antes. Obrigado pela confiança renovada." },
    ],
  },
  {
    key: "parceiros",
    title: "Funil de Parceiros",
    color: "bg-success/10 text-success border-success/20",
    steps: [
      { name: "Parceiro indica", copy: "Olá parceiro! Aqui é da {negocio}. Tudo bem? Tem algum cliente seu que está precisando de {servico}? Como combinamos, retornamos comissão por cada fechamento." },
      { name: "Lead chega", copy: "Olá! O(a) {parceiro} me passou seu contato e disse que você pode precisar de {servico}. Sou da {negocio} e estou à disposição para te apresentar nossa solução." },
      { name: "Apresentação", copy: "Vou te apresentar rapidamente como a {negocio} trabalha com {servico} e os resultados que entregamos. Você tem 10 minutinhos para uma call ou prefere por aqui mesmo?" },
      { name: "Proposta", copy: "Conforme conversamos, segue a proposta de {servico} preparada exclusivamente para você. Qualquer dúvida estou à disposição." },
      { name: "Fechamento", copy: "Excelente! Vamos fechar então. Vou avisar o(a) {parceiro} que deu tudo certo e iniciar nosso processo. Obrigado pela confiança na {negocio}!" },
    ],
  },
];

// ============ Copies ============
const COPY_LIBRARY = [
  {
    category: "WhatsApp",
    items: [
      { title: "Abordagem de lead frio", text: "Olá {cliente}! Aqui é da {negocio}. Vi que você demonstrou interesse em {servico} e queria entender melhor sua necessidade. Posso te fazer 2 perguntinhas rápidas?" },
      { title: "Follow-up após proposta enviada", text: "Oi {cliente}! Tudo bem? Passando para saber se conseguiu analisar a proposta de {servico} que enviei. Estou à disposição para tirar qualquer dúvida." },
      { title: "Cobrança amigável", text: "Olá {cliente}! Tudo bem? Passando rapidinho para lembrar que o pagamento referente ao serviço de {servico} venceu. Quando puder, me avise se está tudo certo do seu lado. Obrigado!" },
      { title: "Reativação de cliente sumido", text: "Oi {cliente}! Faz um tempo que não falamos. Aqui é da {negocio} e queria saber como você está. Temos novidades em {servico} que podem te interessar. Posso te contar?" },
      { title: "Confirmação de serviço agendado", text: "Olá {cliente}! Confirmando nosso compromisso de {servico} para [data e horário]. Combinado? Qualquer alteração me avise. Equipe {negocio}." },
      { title: "Pedido de depoimento pós entrega", text: "Oi {cliente}! Esperamos que esteja muito feliz com o resultado de {servico}. Você poderia gravar um depoimento curto ou nos deixar uma avaliação? Significa muito para a {negocio}!" },
    ],
  },
  {
    category: "Email",
    items: [
      { title: "Boas-vindas para novo lead", text: "Olá {cliente}!\n\nObrigado por se interessar pela {negocio}. Nós ajudamos pessoas como você com {servico}.\n\nNos próximos dias vou te enviar conteúdos para você entender melhor como podemos te ajudar.\n\nAbraço,\nEquipe {negocio}" },
      { title: "Apresentação de proposta", text: "Olá {cliente},\n\nConforme conversamos, segue em anexo a proposta personalizada de {servico} que preparamos para você.\n\nEla foi pensada com base nas suas necessidades. Qualquer dúvida estou à disposição.\n\nAtenciosamente,\n{negocio}" },
      { title: "Pós-entrega pedindo avaliação", text: "Olá {cliente},\n\nFinalizamos a entrega do seu projeto de {servico} e esperamos que esteja super satisfeito(a) com o resultado.\n\nSua opinião é fundamental para a {negocio}. Poderia nos deixar uma avaliação? Levaria menos de 1 minuto.\n\nObrigado!" },
      { title: "Nutrição 1 - O problema", text: "Olá {cliente},\n\nVocê já parou para pensar quanto tempo (e dinheiro) você está perdendo sem uma solução adequada de {servico}?\n\nNo próximo email vou te mostrar o caminho que recomendamos aqui na {negocio}.\n\nAbraço!" },
      { title: "Nutrição 2 - A solução", text: "Olá {cliente},\n\nLembra do problema que comentei? Aqui na {negocio} desenvolvemos uma metodologia própria de {servico} que entrega resultado de forma previsível.\n\nNo próximo email te mostro como começar." },
      { title: "Nutrição 3 - O convite", text: "Olá {cliente},\n\nChegamos no momento da decisão. Se você quer aplicar {servico} no seu contexto, agende uma conversa gratuita com a {negocio} respondendo este email.\n\nVou adorar te ajudar!" },
    ],
  },
  {
    category: "Redes Sociais",
    items: [
      { title: "Post de prova social", text: "Mais um cliente da {negocio} colhendo resultados com {servico}!\n\nEsse é o tipo de transformação que nos move todos os dias. Se você também quer chegar nesse ponto, comenta aqui que te explico como." },
      { title: "Oferta de serviço", text: "ATENÇÃO: vagas limitadas!\n\nNesta semana abrimos condição especial em {servico} aqui na {negocio}. Se você estava esperando o momento certo, ele chegou.\n\nChama no direct para garantir." },
      { title: "Bastidores do negócio", text: "Esses são os bastidores da {negocio} entregando mais um projeto de {servico}.\n\nA gente cuida de cada detalhe porque sabemos o quanto isso faz diferença no resultado final. Curte se concorda!" },
      { title: "Stories com CTA", text: "Você sabia que pode contratar {servico} aqui na {negocio} hoje mesmo?\n\nArrasta pra cima e fala comigo. Te respondo na hora!" },
    ],
  },
];

// ============ Página ============
const ORIGIN_BUCKETS = ["Indicação", "Instagram", "Google", "LinkedIn", "LP", "WhatsApp", "Vitrine", "Outros"];
const COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--secondary))", "hsl(var(--muted-foreground))", "hsl(var(--accent-foreground))", "hsl(var(--ring))"];

const normalizeOrigin = (o: string | null | undefined): string => {
  if (!o) return "Outros";
  const v = o.toLowerCase();
  if (v.includes("indica")) return "Indicação";
  if (v.includes("insta")) return "Instagram";
  if (v.includes("google")) return "Google";
  if (v.includes("linkedin")) return "LinkedIn";
  if (v.includes("lp") || v.includes("landing")) return "LP";
  if (v.includes("whats")) return "WhatsApp";
  if (v.includes("vitrine")) return "Vitrine";
  return "Outros";
};

const fmtCurrency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Marketing() {
  const { user, profile } = useAuth();
  const [businessName, setBusinessName] = useState("seu negócio");
  const [mainService, setMainService] = useState("seu serviço");
  const [copyModal, setCopyModal] = useState<{ open: boolean; title: string; text: string }>({ open: false, title: "", text: "" });
  const [editText, setEditText] = useState("");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [periodFilter, setPeriodFilter] = useState<"month" | "3months" | "year">("month");

  useEffect(() => {
    if (profile?.business_name) setBusinessName(profile.business_name);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("vitrine_items")
        .select("name")
        .eq("user_id", user.id)
        .eq("status", "ativo")
        .order("sort_order", { ascending: true })
        .limit(1);
      if (data && data[0]) setMainService(data[0].name);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name, origin, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (clientsData || []).map((c) => c.id);
      let deals: any[] = [];
      if (ids.length) {
        const { data: dealsData } = await supabase
          .from("deals")
          .select("client_id, stage, value, created_at")
          .eq("user_id", user.id)
          .in("client_id", ids);
        deals = dealsData || [];
      }
      const dealByClient = new Map<string, any>();
      deals.forEach((d) => {
        if (!dealByClient.has(d.client_id)) dealByClient.set(d.client_id, d);
      });
      const mapped: Lead[] = (clientsData || []).map((c) => ({
        id: c.id, name: c.name, origin: c.origin, created_at: c.created_at,
        deal: dealByClient.get(c.id) ? { stage: dealByClient.get(c.id).stage, value: dealByClient.get(c.id).value } : null,
      }));
      setLeads(mapped);
    })();
  }, [user]);

  const injectVars = (text: string) =>
    text
      .replaceAll("{negocio}", businessName || "seu negócio")
      .replaceAll("{servico}", mainService || "seu serviço")
      .replaceAll("{cliente}", "[Nome do Cliente]")
      .replaceAll("{cliente_indicador}", "[Nome do Indicador]")
      .replaceAll("{parceiro}", "[Nome do Parceiro]");

  const openCopy = (title: string, rawText: string) => {
    const text = injectVars(rawText);
    setCopyModal({ open: true, title, text });
    setEditText(text);
  };

  const doCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  // ===== Aba LEADS =====
  const filteredLeads = useMemo(() => {
    const now = new Date();
    let cutoff: Date;
    if (periodFilter === "month") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (periodFilter === "3months") {
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }
    return leads.filter((l) => new Date(l.created_at) >= cutoff);
  }, [leads, periodFilter]);

  const originData = useMemo(() => {
    const counts: Record<string, number> = {};
    ORIGIN_BUCKETS.forEach((b) => (counts[b] = 0));
    filteredLeads.forEach((l) => {
      counts[normalizeOrigin(l.origin)]++;
    });
    return ORIGIN_BUCKETS.filter((b) => counts[b] > 0).map((b) => ({ name: b, value: counts[b] }));
  }, [filteredLeads]);

  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const closed = filteredLeads.filter((l) => l.deal?.stage === "fechado");
    const conversion = total > 0 ? (closed.length / total) * 100 : 0;
    const totalValue = closed.reduce((s, l) => s + (Number(l.deal?.value) || 0), 0);
    const avgTicket = closed.length > 0 ? totalValue / closed.length : 0;
    return { total, converted: closed.length, conversion, avgTicket };
  }, [filteredLeads]);

  const recentLeads = useMemo(() => filteredLeads.slice(0, 10), [filteredLeads]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Megaphone className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Marketing</h1>
          <p className="text-sm text-muted-foreground">Funis, copies prontos e análise de leads.</p>
        </div>
      </div>

      <Tabs defaultValue="funis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="funis">Funis</TabsTrigger>
          <TabsTrigger value="copies">Copies Prontos</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        {/* ===== Aba 1: Funis ===== */}
        <TabsContent value="funis" className="space-y-6">
          {FUNNELS.map((funnel) => (
            <Card key={funnel.key}>
              <CardHeader>
                <CardTitle className="text-lg">{funnel.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-stretch gap-3">
                  {funnel.steps.map((step, i) => (
                    <div key={step.name} className="flex items-stretch gap-3">
                      <div className={`min-w-[180px] flex-1 rounded-lg border-2 p-3 ${funnel.color} flex flex-col justify-between`}>
                        <div>
                          <div className="text-xs font-semibold uppercase opacity-70">Etapa {i + 1}</div>
                          <div className="font-medium mt-1">{step.name}</div>
                        </div>
                        <Button size="sm" variant="outline" className="mt-3 bg-background" onClick={() => openCopy(`${funnel.title} — ${step.name}`, step.copy)}>
                          <Copy className="h-3 w-3 mr-1" /> Ver copy
                        </Button>
                      </div>
                      {i < funnel.steps.length - 1 && (
                        <div className="flex items-center text-muted-foreground">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ===== Aba 2: Copies ===== */}
        <TabsContent value="copies" className="space-y-6">
          {COPY_LIBRARY.map((group) => (
            <Card key={group.category}>
              <CardHeader>
                <CardTitle className="text-lg">{group.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.items.map((item) => (
                    <div key={item.title} className="rounded-lg border p-3 flex flex-col gap-2 bg-card">
                      <div className="font-medium text-sm">{item.title}</div>
                      <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{injectVars(item.text)}</p>
                      <div className="flex gap-2 mt-auto">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openCopy(item.title, item.text)}>
                          <Pencil className="h-3 w-3 mr-1" /> Personalizar
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => doCopy(injectVars(item.text))}>
                          <Copy className="h-3 w-3 mr-1" /> Copiar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ===== Aba 3: Leads ===== */}
        <TabsContent value="leads" className="space-y-6">
          {leads.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Seus leads aparecerão aqui conforme forem cadastrados no pipeline de Vendas.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-end">
                <Select value={periodFilter} onValueChange={(v: any) => setPeriodFilter(v)}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Este mês</SelectItem>
                    <SelectItem value="3months">Últimos 3 meses</SelectItem>
                    <SelectItem value="year">Este ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total de leads</div><div className="text-2xl font-bold mt-1">{stats.total}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Leads convertidos</div><div className="text-2xl font-bold mt-1 text-success">{stats.converted}</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Taxa de conversão</div><div className="text-2xl font-bold mt-1">{stats.conversion.toFixed(1)}%</div></CardContent></Card>
                <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ticket médio</div><div className="text-2xl font-bold mt-1">{fmtCurrency(stats.avgTicket)}</div></CardContent></Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Origem dos leads</CardTitle></CardHeader>
                  <CardContent>
                    {originData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem dados no período.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={originData} dataKey="value" nameKey="name" outerRadius={90} label={(e: any) => `${e.name} ${((e.percent || 0) * 100).toFixed(0)}%`}>
                            {originData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Últimos 10 leads</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentLeads.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">{l.name}</TableCell>
                            <TableCell><Badge variant="secondary">{normalizeOrigin(l.origin)}</Badge></TableCell>
                            <TableCell className="text-xs">{new Date(l.created_at).toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell><Badge variant="outline">{l.deal?.stage || "sem negócio"}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de copy */}
      <Dialog open={copyModal.open} onOpenChange={(o) => setCopyModal((s) => ({ ...s, open: o }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{copyModal.title}</DialogTitle></DialogHeader>
          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={10} className="font-mono text-sm" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCopyModal((s) => ({ ...s, open: false }))}>Fechar</Button>
            <Button onClick={() => { doCopy(editText); setCopyModal((s) => ({ ...s, open: false })); }}>
              <Copy className="h-4 w-4 mr-2" /> Copiar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
