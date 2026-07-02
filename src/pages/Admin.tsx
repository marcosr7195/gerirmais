import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Shield, UserPlus, Ban, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "marcos7195@gmail.com";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    plano: string | null;
    status_assinatura: string | null;
    data_vencimento: string | null;
    business_name: string | null;
  } | null;
}

const statusColor: Record<string, string> = {
  ativo: "bg-success/10 text-success",
  trial: "bg-primary/10 text-primary",
  atrasado: "bg-warning/10 text-warning",
  inativo: "bg-destructive/10 text-destructive",
};

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // create form
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPlano, setNewPlano] = useState("pro");
  const [newVencimento, setNewVencimento] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // edit
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editPlano, setEditPlano] = useState("pro");
  const [editVencimento, setEditVencimento] = useState("");
  const [editStatus, setEditStatus] = useState("ativo");

  if (user && user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  const call = async (action: string, payload: any = {}) => {
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action, ...payload },
    });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await call("list");
      setUsers(res.users || []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newEmail || !newPlano || !newVencimento) return toast.error("Preencha todos os campos");
    try {
      await call("create", { email: newEmail, plano: newPlano, data_vencimento: new Date(newVencimento).toISOString() });
      toast.success("Usuário convidado! Ele receberá um e-mail.");
      setCreateOpen(false);
      setNewEmail("");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditPlano(u.profile?.plano || "pro");
    setEditStatus(u.profile?.status_assinatura || "ativo");
    setEditVencimento(u.profile?.data_vencimento ? u.profile.data_vencimento.slice(0, 10) : "");
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      await call("update", {
        user_id: editUser.id,
        plano: editPlano,
        status_assinatura: editStatus,
        data_vencimento: editVencimento ? new Date(editVencimento).toISOString() : null,
      });
      toast.success("Usuário atualizado");
      setEditUser(null);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRevoke = async (u: AdminUser) => {
    try {
      await call("revoke", { user_id: u.id });
      toast.success("Acesso revogado");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = users.filter((u) =>
    !search ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.profile?.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">Administração</h1>
            <p className="text-sm text-muted-foreground">Gestão de usuários e planos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="h-4 w-4 mr-2" /> Cadastrar usuário</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar novo usuário</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="usuario@exemplo.com" />
                </div>
                <div>
                  <Label>Plano</Label>
                  <Select value={newPlano} onValueChange={setNewPlano}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="scale">Scale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data de vencimento do acesso</Label>
                  <Input type="date" value={newVencimento} onChange={(e) => setNewVencimento(e.target.value)} />
                </div>
                <Button className="w-full" onClick={handleCreate}>Cadastrar e enviar convite</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Usuários ({filtered.length})</span>
            <Input placeholder="Buscar por email ou negócio" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Negócio</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.profile?.business_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{u.profile?.plano || "—"}</Badge></TableCell>
                  <TableCell>
                    <Badge className={statusColor[u.profile?.status_assinatura || ""] || ""}>
                      {u.profile?.status_assinatura || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.profile?.data_vencimento ? new Date(u.profile.data_vencimento).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{new Date(u.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-3 w-3" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive"><Ban className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O usuário {u.email} perderá o acesso ao sistema. Você pode reativar depois editando o status.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevoke(u)}>Revogar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar {editUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Plano</Label>
              <Select value={editPlano} onValueChange={setEditPlano}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de vencimento</Label>
              <Input type="date" value={editVencimento} onChange={(e) => setEditVencimento(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleUpdate}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
