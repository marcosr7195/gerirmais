import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MyUnit { unit_id: string; name: string; role: keyof typeof ROLE_LABELS; is_owner: boolean }

export function UnitSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { profile, refreshProfile } = useAuth();
  const [units, setUnits] = useState<MyUnit[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [document, setDocument] = useState("");
  const [saving, setSaving] = useState(false);
  const [limitMsg, setLimitMsg] = useState("");

  const load = async () => {
    const { data } = await supabase.rpc("list_my_units" as any);
    setUnits((data as MyUnit[]) || []);
  };
  useEffect(() => { load(); }, [profile?.active_unit_id]);

  const active = units.find((u) => u.unit_id === profile?.active_unit_id);
  const mine = units.filter((u) => u.is_owner);
  const teams = units.filter((u) => !u.is_owner);

  const switchTo = async (id: string) => {
    if (id === profile?.active_unit_id) return;
    const { error } = await supabase.rpc("switch_active_unit" as any, { p_unit: id });
    if (error) return toast.error("Não foi possível trocar de negócio.");
    await refreshProfile();
    window.location.href = "/";
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setLimitMsg("");
    const { data, error } = await supabase.rpc("create_my_business" as any, {
      p_name: name.trim(), p_service_type: serviceType.trim() || null, p_document: document.trim() || null,
    });
    const res = data as { success: boolean; limit?: boolean; message?: string } | null;
    setSaving(false);
    if (error || !res?.success) {
      if (res?.limit) setLimitMsg(res.message || "");
      else toast.error(res?.message || "Erro ao criar o negócio.");
      return;
    }
    toast.success("Negócio criado!");
    await refreshProfile();
    window.location.href = "/";
  };

  if (collapsed) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="mt-2 w-full justify-between bg-transparent">
            <span className="truncate">{active?.name || profile?.business_name || "Meu Negócio"}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" align="start">
          {mine.length > 0 && <DropdownMenuLabel>Meus negócios</DropdownMenuLabel>}
          {mine.map((u) => (
            <DropdownMenuItem key={u.unit_id} onClick={() => switchTo(u.unit_id)}>
              <span className="flex-1 truncate">{u.name}</span>
              {u.unit_id === profile?.active_unit_id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          {teams.length > 0 && <DropdownMenuLabel>Equipes que participo</DropdownMenuLabel>}
          {teams.map((u) => (
            <DropdownMenuItem key={u.unit_id} onClick={() => switchTo(u.unit_id)}>
              <span className="flex-1 truncate">{u.name}</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABELS[u.role]}</span>
              {u.unit_id === profile?.active_unit_id && <Check className="ml-1 h-4 w-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar meu negócio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar meu negócio</DialogTitle>
            <DialogDescription>
              Você será o proprietário. {mine.length === 0 && "Seu primeiro negócio tem 14 dias grátis; depois é preciso assinar um plano."} Você continua nas equipes de que já participa.
            </DialogDescription>
          </DialogHeader>
          {limitMsg ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{limitMsg}</p>
              <Button asChild className="w-full"><Link to="/planos" onClick={() => setOpen(false)}>Ver planos</Link></Button>
            </div>
          ) : (
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-1"><Label>Nome do negócio *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Tipo de serviço</Label><Input value={serviceType} onChange={(e) => setServiceType(e.target.value)} /></div>
              <div className="space-y-1"><Label>CNPJ ou CPF (opcional)</Label><Input value={document} onChange={(e) => setDocument(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "Criando..." : "Criar negócio"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
