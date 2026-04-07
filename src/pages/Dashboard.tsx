import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, ClipboardList, Users, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Summary {
  balance: number;
  pendingDeals: number;
  todayDeliveries: number;
  newLeads: number;
  upcomingBills: { id: string; description: string; amount: number; due_date: string }[];
  chartData: { month: string; receita: number; despesa: number }[];
}

export default function Dashboard() {
  const { profile, user } = useAuth();
  const [summary, setSummary] = useState<Summary>({
    balance: 0, pendingDeals: 0, todayDeliveries: 0, newLeads: 0,
    upcomingBills: [], chartData: []
  });

  useEffect(() => {
    if (!user) return;
    loadSummary();
  }, [user]);

  const loadSummary = async () => {
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const today = now.toISOString().slice(0, 10);
    const in3days = new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10);

    const [txRes, dealsRes, osRes, leadsRes, billsRes] = await Promise.all([
      supabase.from("transactions").select("*").eq("user_id", user!.id),
      supabase.from("deals").select("*").eq("user_id", user!.id).in("stage", ["lead", "negociando"]),
      supabase.from("service_orders").select("*").eq("user_id", user!.id).eq("due_date", today).neq("status", "concluido"),
      supabase.from("deals").select("*").eq("user_id", user!.id).eq("stage", "lead"),
      supabase.from("transactions").select("*").eq("user_id", user!.id).eq("type", "despesa").in("status", ["pendente"]).gte("due_date", today).lte("due_date", in3days),
    ]);

    const transactions = txRes.data || [];
    const monthTx = transactions.filter(t => t.date?.startsWith(thisMonth));
    const balance = monthTx.reduce((acc, t) => acc + (t.type === "receita" ? Number(t.amount) : -Number(t.amount)), 0);

    // Chart data - last 6 months
    const chartData: Summary["chartData"] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      const monthTxs = transactions.filter(t => t.date?.startsWith(key));
      chartData.push({
        month: label,
        receita: monthTxs.filter(t => t.type === "receita").reduce((a, t) => a + Number(t.amount), 0),
        despesa: monthTxs.filter(t => t.type === "despesa").reduce((a, t) => a + Number(t.amount), 0),
      });
    }

    setSummary({
      balance,
      pendingDeals: dealsRes.data?.length || 0,
      todayDeliveries: osRes.data?.length || 0,
      newLeads: leadsRes.data?.length || 0,
      upcomingBills: (billsRes.data || []).map(b => ({
        id: b.id, description: b.description, amount: Number(b.amount), due_date: b.due_date!,
      })),
      chartData,
    });
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const cards = [
    { title: "Saldo do mês", value: fmt(summary.balance), icon: DollarSign, color: "text-primary" },
    { title: "Orçamentos pendentes", value: String(summary.pendingDeals), icon: FileText, color: "text-warning" },
    { title: "Entregas hoje", value: String(summary.todayDeliveries), icon: ClipboardList, color: "text-success" },
    { title: "Leads novos", value: String(summary.newLeads), icon: Users, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Olá, {profile?.business_name || "Bem-vindo"} 👋</h1>
        <p className="text-muted-foreground">Aqui está o resumo do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{c.title}</p>
                  <p className="text-2xl font-bold mt-1">{c.value}</p>
                </div>
                <c.icon className={`h-8 w-8 ${c.color} opacity-70`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {summary.upcomingBills.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium text-sm">Contas a vencer nos próximos 3 dias</span>
            </div>
            <div className="space-y-1">
              {summary.upcomingBills.map((b) => (
                <div key={b.id} className="flex justify-between text-sm">
                  <span>{b.description}</span>
                  <span className="font-medium">{fmt(b.amount)} - {new Date(b.due_date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Receita x Despesa (últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
