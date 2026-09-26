import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Mail, Plus, Trash2, Users } from "lucide-react";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UnitRole } from "@/contexts/AuthContext";

interface Member {
  id: string; user_id: string | null; email: string | null; name: string | null;
  role: UnitRole; accepted_at: string | null; created_at: string; expires_at: string | null; invite_token: string | null;
}

const inviteLink = (token: string) => `${window.location.origin}/convite/${token}`;
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export function TeamSettings() {
  const [members, setMembers] = useState<Member[]>([]);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UnitRole>("collaborator");
  const [link, setLink] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("list_unit_members" as any);
    if (!error) setMembers((data as Member[]) || []);
  };
  useEffect(() => { load(); }, []);

  const sendEmail = async (memberId: string) => {
    const { data, error } = await supabase.functions.invoke("send-team-invite", { body: { member_id: memberId } });
    if (error || !(data as any)?.sent) {
      toast.error("Não foi possível enviar o e-mail. Copie o link e envie manualmente.");
      return false;
    }
    toast.success("Convite enviado por e-mail.");
    return true;
  };

  const invite = async () => {
    setSending(true);
    const { data, error } = await supabase.rpc("invite_unit_member" as any, { p_email: email.trim(), p_role: role });
    if (error) { setSending(false); return toast.error(error.message.includes("inválido") ? error.message : "Não foi possível convidar."); }
    const token = data as string;
    setLink(inviteLink(token));
    const { data: list } = await supabase.rpc("list_unit_members" as any);
    const rows = (list as Member[]) || [];
    setMembers(rows);
    const m = rows.find((r) => r.invite_token === token);
    if (m) await sendEmail(m.id);
    setSending(false);
  };


  const changeRole = async (id: string, r: UnitRole) => {
    const { error } = await supabase.rpc("update_unit_member_role" as any, { p_member: id, p_role: r });
    if (error) toast.error("Não foi possível alterar o papel."); else { toast.success("Papel atualizado."); load(); }
  };
  const remove = async (id: string) => {
    if (!confirm("Remover o acesso deste membro?")) return;
    const { error } = await supabase.rpc("remove_unit_member" as any, { p_member: id });
    if (error) toast.error("Não foi possível remover."); else { toast.success("Acesso removido."); load(); }
  };

  const closeModal = () => { setOpen(false); setLink(null); setEmail(""); setRole("collaborator"); };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> Equipe</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Convidar membro</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium truncate">{m.name || m.email}</p>
              <p className="text-sm text-muted-foreground truncate">{m.email}</p>
              <p className="text-xs text-muted-foreground">
                {m.accepted_at ? `Entrou em ${fmt(m.accepted_at)}` : `Convite pendente · expira em ${fmt(m.expires_at)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {m.role === "owner" ? (
                <Badge>{ROLE_LABELS.owner}</Badge>
              ) : (
                <>
                  {!m.accepted_at && m.invite_token && (
                    <>
                      <Button variant="ghost" size="icon" title="Reenviar convite por e-mail" onClick={() => sendEmail(m.id)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Copiar link" onClick={() => { navigator.clipboard.writeText(inviteLink(m.invite_token!)); toast.success("Link copiado."); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as UnitRole)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
                      <SelectItem value="collaborator">{ROLE_LABELS.collaborator}</SelectItem>
                      <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" title="Remover acesso" onClick={() => remove(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : closeModal())}>
        <DialogContent>
          <DialogHeader><DialogTitle>Convidar membro</DialogTitle></DialogHeader>
          {link ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Convite criado e enviado para {email} (válido por 7 dias). Se preferir, copie o link:</p>
              <Input readOnly value={link} onFocus={(e) => e.target.select()} />
              <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado."); }}>
                <Copy className="mr-1 h-4 w-4" /> Copiar link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UnitRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Gerente — tudo, exceto excluir e dados financeiros</SelectItem>
                    <SelectItem value="collaborator">Colaborador — só Vendas e Entregáveis</SelectItem>
                    <SelectItem value="viewer">Visualizador — somente leitura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            {link ? <Button onClick={closeModal}>Concluir</Button> : (
              <Button onClick={invite} disabled={sending || !email.includes("@")}>{sending ? "Criando..." : "Criar convite"}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
