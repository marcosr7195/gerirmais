import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  ClipboardList,
  Users,
  AlertTriangle,
  Plus,
  UserPlus,
  Briefcase,
  Store,
  Target,
  PartyPopper,
  CalendarClock,
  TrendingUp,
  Sparkles,
  Pencil,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "sonner";

interface ChartPoint {
  month: string;
  receita: number;
  despesa: number;
}

interface PendingBill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
}

interface PendingOS {
  id: string;
  title: string;
  due_date: string;
  overdue: boolean;
}

interface StaleLead {
  id: string;
  title: string;
  days: number;
}

interface ModuleStats {
  balance: number;
  pendingDeals: number;
  todayDeliveries: number;
  newLeadsThisMonth: number;
  closedDealsThisMonth: number;
  closedDealsValueThisMonth: number;
  openServiceOrders: number;
  activeVitrineItems: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const goalKey = (uid: string) => `gerirmais:monthly_goal:${uid}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [stats, setStats] = useState<ModuleStats>({
    balance: 0,
    pendingDeals: 0,
    todayDeliveries: 0,
    newLeadsThisMonth: 0,
    closedDealsThisMonth: 0,
    closedDealsValueThisMonth: 0,
    openServiceOrders: 0,
    activeVitrineItems: 0,
  });
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [bills, setBills] = useState<PendingBill[]>([]);
  const [pendingOS, setPendingOS] = useState<PendingOS[]>([]);
  const [staleLeads, setStaleLeads] = useState<StaleLead[]>([]);

  const [goal, setGoal] = useState<number>(0);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(goalKey(user.id));
    setGoal(raw ? Number(raw) || 0 : 0);
    void loadAll();
  }, [user]);

  const loadAll = async () => {
    if (!user) return;
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const today = now.toISOString().slice(0, 10);
    const in3days = new Date(now.getTime() + 3 * 86400000)
      .toISOString()
      .slice(0, 10);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString();
    const monthStart = `${thisMonth}-01`;

    const [
      txRes,
      proposalsRes,
      osTodayRes,
      osOpenRes,
      dealsRes,
      billsRes,
      archivedDealsRes,
      vitrineRes,
      newLeadsRes,
    ] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user.id),
      supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("service_orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("due_date", today)
        .neq("status", "concluida"),
      supabase
        .from("service_orders")
        .select("id, title, due_date, status")
        .eq("user_id", user.id)
        .neq("status", "concluida"),
      supabase
        .from("deals")
        .select("id, title, stage, updated_at, archived_at")
        .eq("user_id", user.id)
        .is("archived_at", null),
      supabase
        .from("transactions")
        .select("id, description, amount, due_date")
        .eq("user_id", user.id)
        .eq("type", "despesa")
        .in("status", ["pendente"])
        .gte("due_date", today)
        .lte("due_date", in3days)
        .order("due_date", { ascending: true }),
      supabase
        .from("deals")
        .select("id, value, archived_at")
        .eq("user_id", user.id)
        .not("archived_at", "is", null),
      supabase
        .from("vitrine_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "ativo"),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart),
    ]);

    const transactions = txRes.data || [];

    // balance & revenue this month
    const monthTx = transactions.filter((t: any) =>
      t.date?.startsWith(thisMonth)
    );
    const balance = monthTx.reduce(
      (acc: number, t: any) =>
        acc + (t.type === "receita" ? Number(t.amount) : -Number(t.amount)),
      0
    );
    const revenue = monthTx
      .filter((t: any) => t.type === "receita")
      .reduce((a: number, t: any) => a + Number(t.amount), 0);

    // Last 6 months
    const points: ChartPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      const monthTxs = transactions.filter((t: any) =>
        t.date?.startsWith(key)
      );
      points.push({
        month: label,
        receita: monthTxs
          .filter((t: any) => t.type === "receita")
          .reduce((a: number, t: any) => a + Number(t.amount), 0),
        despesa: monthTxs
          .filter((t: any) => t.type === "despesa")
          .reduce((a: number, t: any) => a + Number(t.amount), 0),
      });
    }

    const archivedDeals = ((archivedDealsRes.data || []) as any[]).filter(
      (deal) => deal.archived_at?.startsWith(thisMonth)
    );
    const closedDealsValueThisMonth = archivedDeals.reduce(
      (acc, d) => acc + Number(d.value || 0),
      0
    );

    // Pending OS: due today or overdue (not concluida)
    const osPending: PendingOS[] = ((osOpenRes.data || []) as any[])
      .filter((o) => o.due_date && o.due_date <= today)
      .map((o) => ({
        id: o.id,
        title: o.title,
        due_date: o.due_date,
        overdue: o.due_date < today,
      }))
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    // Stale leads: not archived, updated_at older than 5 days
    const stale: StaleLead[] = ((dealsRes.data || []) as any[])
      .filter((d) => d.updated_at && d.updated_at < fiveDaysAgo)
      .map((d) => {
        const days = Math.floor(
          (now.getTime() - new Date(d.updated_at).getTime()) / 86400000
        );
        return { id: d.id, title: d.title, days };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 8);

    setChartData(points);
    setRevenueThisMonth(revenue);
    setBills(
      (billsRes.data || []).map((b: any) => ({
        id: b.id,
        description: b.description,
        amount: Number(b.amount),
        due_date: b.due_date!,
      }))
    );
    setPendingOS(osPending);
    setStaleLeads(stale);
    setStats({
      balance,
      pendingDeals: proposalsRes.count || 0,
      todayDeliveries: osTodayRes.data?.length || 0,
      newLeadsThisMonth: newLeadsRes.count || 0,
      closedDealsThisMonth: archivedDeals.length,
      closedDealsValueThisMonth,
      openServiceOrders: (osOpenRes.data || []).length,
      activeVitrineItems: vitrineRes.count || 0,
    });
  };

  const goalProgress = useMemo(() => {
    if (!goal || goal <= 0) return 0;
    return Math.min(200, Math.round((revenueThisMonth / goal) * 100));
  }, [revenueThisMonth, goal]);

  const saveGoal = () => {
    if (!user) return;
    const n = Number(goalDraft.replace(",", "."));
    if (Number.isNaN(n) || n < 0) {
      toast.error("Informe um valor válido");
      return;
    }
    localStorage.setItem(goalKey(user.id), String(n));
    setGoal(n);
    setGoalEditing(false);
    toast.success("Meta atualizada");
  };

  const quickActions = [
    {
      label: "Novo Lançamento",
      icon: DollarSign,
      onClick: () => navigate("/financas?new=1"),
    },
    {
      label: "Novo Lead",
      icon: UserPlus,
      onClick: () => navigate("/vendas?new=1"),
    },
    { label: "Nova OS", icon: ClipboardList, onClick: () => navigate("/entregas?new=1") },
    {
      label: "Item na Vitrine",
      icon: Store,
      onClick: () => navigate("/vitrine?new=1"),
    },
  ];

  const moduleCards = [
    {
      title: "Saldo atual",
      value: fmt(stats.balance),
      icon: DollarSign,
      color: "text-primary",
      to: "/financas",
    },
    {
      title: "Negócios em andamento",
      value: String(stats.pendingDeals),
      icon: Briefcase,
      color: "text-warning",
      to: "/vendas",
    },
    {
      title: "OS em aberto",
      value: String(stats.openServiceOrders),
      icon: ClipboardList,
      color: "text-success",
      to: "/entregas",
    },
    {
      title: "Leads este mês",
      value: String(stats.newLeadsThisMonth),
      icon: Users,
      color: "text-primary",
      to: "/marketing",
    },
    {
      title: "Total na Vitrine",
      value: String(stats.activeVitrineItems),
      icon: Store,
      color: "text-primary",
      to: "/vitrine",
    },
    {
      title: "Fechados no mês",
      value: `${stats.closedDealsThisMonth} · ${fmt(
        stats.closedDealsValueThisMonth
      )}`,
      icon: TrendingUp,
      color: "text-success",
      to: "/vendas",
    },
  ];

  const totalPendings = bills.length + pendingOS.length + staleLeads.length;
  const goalReached = goal > 0 && revenueThisMonth >= goal;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">
          Olá, {profile?.business_name || "Bem-vindo"} 👋
        </h1>
        <p className="text-muted-foreground">Aqui está o resumo do seu negócio</p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((a) => (
          <Button
            key={a.label}
            variant="outline"
            size="sm"
            onClick={a.onClick}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
          </Button>
        ))}
      </div>

      {/* Middle: chart + meta (left) | pendings (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Receita x Despesa (últimos 6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis
                      fontSize={12}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="receita"
                      stroke="hsl(var(--success))"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="despesa"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card
            className={
              goalReached
                ? "border-success/40 bg-success/5"
                : "glass-card"
            }
          >
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Meta do mês
              </CardTitle>
              {!goalEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGoalDraft(goal ? String(goal) : "");
                    setGoalEditing(true);
                  }}
                  className="h-8 gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  {goal ? "Editar" : "Definir"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {goalEditing ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    type="number"
                    inputMode="decimal"
                    placeholder="Ex.: 10000"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveGoal();
                      if (e.key === "Escape") setGoalEditing(false);
                    }}
                  />
                  <Button size="sm" onClick={saveGoal}>
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setGoalEditing(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : goal > 0 ? (
                <>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Faturamento do mês
                      </p>
                      <p className="text-2xl font-bold">
                        {fmt(revenueThisMonth)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Meta</p>
                      <p className="text-lg font-semibold">{fmt(goal)}</p>
                    </div>
                  </div>
                  <Progress value={Math.min(100, goalProgress)} />
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={
                        goalReached
                          ? "font-semibold text-success flex items-center gap-1"
                          : "text-muted-foreground"
                      }
                    >
                      {goalReached && (
                        <PartyPopper className="h-4 w-4" />
                      )}
                      {goalProgress}% atingido
                    </span>
                    {goalReached && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-success/15 text-success font-medium">
                        <Sparkles className="h-3 w-3" /> Meta batida!
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Defina uma meta de faturamento mensal para acompanhar seu
                  progresso.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pendências */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-warning" />
              Pendências de hoje
              {totalPendings > 0 && (
                <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                  {totalPendings}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalPendings === 0 && (
              <p className="text-sm text-muted-foreground">
                Nada pendente. Bom trabalho! ✨
              </p>
            )}

            {bills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Contas a vencer (3 dias)
                </p>
                <ul className="space-y-1.5">
                  {bills.map((b) => (
                    <li key={b.id}>
                      <Link
                        to="/financas"
                        className="flex items-start justify-between gap-2 text-sm p-2 -mx-2 rounded hover:bg-muted/50 transition"
                      >
                        <span className="truncate">{b.description}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmt(b.amount)} ·{" "}
                          {new Date(
                            b.due_date + "T12:00:00"
                          ).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pendingOS.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  OS vencendo / atrasadas
                </p>
                <ul className="space-y-1.5">
                  {pendingOS.map((o) => (
                    <li key={o.id}>
                      <Link
                        to="/entregas"
                        className="flex items-start justify-between gap-2 text-sm p-2 -mx-2 rounded hover:bg-muted/50 transition"
                      >
                        <span className="truncate flex items-center gap-1.5">
                          {o.overdue && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          )}
                          {o.title}
                        </span>
                        <span
                          className={`text-xs whitespace-nowrap ${
                            o.overdue
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {o.overdue ? "Atrasada" : "Hoje"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {staleLeads.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Leads parados (+5 dias)
                </p>
                <ul className="space-y-1.5">
                  {staleLeads.map((l) => (
                    <li key={l.id}>
                      <Link
                        to="/vendas"
                        className="flex items-start justify-between gap-2 text-sm p-2 -mx-2 rounded hover:bg-muted/50 transition"
                      >
                        <span className="truncate">{l.title}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {l.days}d sem mov.
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module summary */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Resumo por módulo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {moduleCards.map((c) => (
            <Link key={c.title} to={c.to}>
              <Card className="glass-card hover:border-primary/40 transition cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {c.title}
                      </p>
                      <p className="text-lg font-bold mt-1 truncate">
                        {c.value}
                      </p>
                    </div>
                    <c.icon
                      className={`h-7 w-7 ${c.color} opacity-70 shrink-0`}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
