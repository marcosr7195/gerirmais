import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Plus, Pencil, Trash2, Pause, Play, Image as ImageIcon, ExternalLink, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface VitrineItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_type: string;
  price_min: number | null;
  price_max: number | null;
  duration: string | null;
  image_url: string | null;
  status: string;
}

const CATEGORIES = [
  { value: "servico", label: "Serviço" },
  { value: "produto_fisico", label: "Produto físico" },
  { value: "produto_digital", label: "Produto digital" },
  { value: "pacote", label: "Pacote" },
];

const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label || v;

export const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

const emptyForm = () => ({
  name: "",
  category: "servico",
  description: "",
  price_type: "fixo",
  price_min: "",
  price_max: "",
  duration: "",
  image_url: "",
  status: "ativo",
});

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Vitrine() {
  const { user, profile, refreshProfile } = useAuth();
  const [items, setItems] = useState<VitrineItem[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const slug = useMemo(() => {
    if (profile?.slug) return profile.slug;
    if (profile?.business_name) return slugify(profile.business_name);
    return "";
  }, [profile]);

  const publicUrl = useMemo(() => (slug ? `${window.location.origin}/vitrine/${slug}` : ""), [slug]);

  useEffect(() => {
    if (user) void load();
  }, [user]);

  useEffect(() => {
    // Backfill slug on profile if missing
    if (user && profile && !profile.slug && profile.business_name) {
      const newSlug = slugify(profile.business_name);
      supabase
        .from("profiles")
        .update({ slug: newSlug } as any)
        .eq("user_id", user.id)
        .then(() => void refreshProfile());
    }
  }, [user, profile, refreshProfile]);

  const load = async () => {
    const { data } = await supabase
      .from("vitrine_items" as any)
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (it: VitrineItem) => {
    setEditingId(it.id);
    setForm({
      name: it.name,
      category: it.category,
      description: it.description || "",
      price_type: it.price_type,
      price_min: it.price_min != null ? String(it.price_min) : "",
      price_max: it.price_max != null ? String(it.price_max) : "",
      duration: it.duration || "",
      image_url: it.image_url || "",
      status: it.status,
    });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("vitrine").upload(path, file, { upsert: false });
      if (error) {
        toast.error("Erro ao enviar imagem");
        return;
      }
      const { data } = supabase.storage.from("vitrine").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    try {
      const payload: any = {
        user_id: user.id,
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || null,
        price_type: form.price_type,
        price_min: form.price_min ? Number(form.price_min) : 0,
        price_max: form.price_type === "faixa" && form.price_max ? Number(form.price_max) : null,
        duration: form.duration.trim() || null,
        image_url: form.image_url || null,
        status: form.status,
      };

      const { error } = editingId
        ? await supabase.from("vitrine_items" as any).update(payload).eq("id", editingId)
        : await supabase.from("vitrine_items" as any).insert(payload);

      if (error) {
        toast.error("Erro ao salvar item");
        return;
      }
      toast.success(editingId ? "Item atualizado!" : "Item adicionado!");
      setOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (it: VitrineItem) => {
    const newStatus = it.status === "ativo" ? "pausado" : "ativo";
    await supabase.from("vitrine_items" as any).update({ status: newStatus }).eq("id", it.id);
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from("vitrine_items" as any).delete().eq("id", id);
    toast.success("Item removido");
    void load();
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  const shareWhatsapp = () => {
    if (!publicUrl) return;
    const text = `Confira minha vitrine: ${publicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const renderPrice = (it: VitrineItem) => {
    if (it.price_type === "faixa" && it.price_max) {
      return `${fmt(Number(it.price_min || 0))} a ${fmt(Number(it.price_max))}`;
    }
    return fmt(Number(it.price_min || 0));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            Vitrine
          </h1>
          <p className="text-muted-foreground">O que seu negócio oferece em um catálogo visual</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {publicUrl && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/vitrine/${slug}`} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                  Ver minha Vitrine
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="h-4 w-4" />
                Copiar link
              </Button>
              <Button variant="outline" size="sm" onClick={shareWhatsapp}>
                <Share2 className="h-4 w-4" />
                WhatsApp
              </Button>
            </>
          )}
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Adicionar item
          </Button>
        </div>
      </div>

      {!slug && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 text-sm">
            Cadastre o nome do seu negócio em Configurações para gerar o link da Vitrine pública.
          </CardContent>
        </Card>
      )}

      {items.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-10 text-center text-muted-foreground">
            <Store className="h-10 w-10 mx-auto mb-3 opacity-40" />
            Nenhum item cadastrado. Adicione seu primeiro serviço ou produto.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Card key={it.id} className="glass-card overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                )}
                <Badge
                  variant="outline"
                  className={`absolute top-2 right-2 ${it.status === "ativo" ? "bg-success/10 text-success border-success/30" : "bg-muted text-muted-foreground"}`}
                >
                  {it.status === "ativo" ? "Ativo" : "Pausado"}
                </Badge>
              </div>
              <CardContent className="p-4 flex-1 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabel(it.category)}</p>
                  </div>
                  <p className="text-sm font-medium text-primary whitespace-nowrap">{renderPrice(it)}</p>
                </div>
                {it.duration && <p className="text-xs text-muted-foreground">⏱ {it.duration}</p>}
                {it.description && <p className="text-sm text-muted-foreground line-clamp-2">{it.description}</p>}
                <div className="mt-auto flex items-center gap-1 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(it)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleStatus(it)}>
                    {it.status === "ativo" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {it.status === "ativo" ? "Pausar" : "Ativar"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir item</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(it.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar item" : "Adicionar item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={1000} />
            </div>
            <div className="space-y-2">
              <Label>Preço</Label>
              <RadioGroup value={form.price_type} onValueChange={(v) => setForm({ ...form, price_type: v })} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="fixo" id="pt-fixo" />
                  <Label htmlFor="pt-fixo" className="font-normal">Valor fixo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="faixa" id="pt-faixa" />
                  <Label htmlFor="pt-faixa" className="font-normal">Faixa de preço</Label>
                </div>
              </RadioGroup>
              {form.price_type === "fixo" ? (
                <Input type="number" step="0.01" min="0" placeholder="Ex: 150.00" value={form.price_min} onChange={(e) => setForm({ ...form, price_min: e.target.value })} />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" step="0.01" min="0" placeholder="De R$" value={form.price_min} onChange={(e) => setForm({ ...form, price_min: e.target.value })} />
                  <Input type="number" step="0.01" min="0" placeholder="Até R$" value={form.price_max} onChange={(e) => setForm({ ...form, price_max: e.target.value })} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tempo de entrega ou duração</Label>
              <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="Ex: 2 horas, 7 dias" />
            </div>
            <div className="space-y-2">
              <Label>Foto</Label>
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              {form.image_url && (
                <img src={form.image_url} alt="preview" className="w-full h-32 object-cover rounded-md" />
              )}
              {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
            </div>
            <Button type="submit" className="w-full" disabled={saving || uploading}>
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
