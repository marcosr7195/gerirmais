import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Store, Instagram, Mail, MessageCircle, Image as ImageIcon, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PublicItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_type: string;
  price_min: number | null;
  price_max: number | null;
  duration: string | null;
  image_url: string | null;
}

interface PublicBusiness {
  business_name: string | null;
  slogan: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  commercial_email: string | null;
  slug: string;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const categoryLabel = (v: string) => {
  const map: Record<string, string> = {
    servico: "Serviço",
    produto_fisico: "Produto físico",
    produto_digital: "Produto digital",
    pacote: "Pacote",
  };
  return map[v] || v;
};

const renderPrice = (it: PublicItem) => {
  if (it.price_type === "faixa" && it.price_max) {
    return `${fmt(Number(it.price_min || 0))} a ${fmt(Number(it.price_max))}`;
  }
  return fmt(Number(it.price_min || 0));
};

const onlyDigits = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

export default function VitrinePublica() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void load();
  }, [slug]);

  const load = async () => {
    if (!slug) return;
    const { data, error } = await (supabase as any).rpc("get_vitrine_by_slug", { p_slug: slug });
    setLoading(false);
    if (error || !data) {
      setNotFound(true);
      return;
    }
    setBusiness(data.business);
    setItems(data.items || []);
  };

  const url = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const shareWhatsapp = () => {
    const text = `Confira a vitrine de ${business?.business_name || ""}: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Carregando vitrine...</p>
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <Store className="h-12 w-12 text-muted-foreground/40" />
        <h1 className="text-2xl font-bold">Vitrine não encontrada</h1>
        <p className="text-muted-foreground">O endereço acessado não corresponde a nenhum negócio.</p>
        <Button asChild variant="outline">
          <Link to="/">Voltar</Link>
        </Button>
      </div>
    );
  }

  const whatsappDigits = onlyDigits(business.whatsapp);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10 max-w-5xl">
          <div className="flex flex-col items-center text-center gap-4">
            {business.logo_url ? (
              <img src={business.logo_url} alt={business.business_name || ""} className="h-20 w-20 rounded-full object-cover border" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Store className="h-10 w-10" />
              </div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{business.business_name || "Negócio"}</h1>
              {business.slogan && <p className="text-muted-foreground mt-1">{business.slogan}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {whatsappDigits && (
                <Button size="sm" asChild>
                  <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {business.instagram && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://instagram.com/${business.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer">
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </a>
                </Button>
              )}
              {business.commercial_email && (
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${business.commercial_email}`}>
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={copyLink}>
                <Copy className="h-4 w-4" />
                Copiar link
              </Button>
              <Button size="sm" variant="ghost" onClick={shareWhatsapp}>
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {items.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              Nenhum item disponível no momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <Card key={it.id} className="overflow-hidden flex flex-col">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
                <CardContent className="p-4 flex-1 flex flex-col gap-2">
                  <Badge variant="outline" className="self-start text-xs">{categoryLabel(it.category)}</Badge>
                  <p className="font-semibold">{it.name}</p>
                  {it.description && <p className="text-sm text-muted-foreground line-clamp-3">{it.description}</p>}
                  {it.duration && <p className="text-xs text-muted-foreground">⏱ {it.duration}</p>}
                  <p className="text-lg font-bold text-primary mt-auto">{renderPrice(it)}</p>
                  {whatsappDigits && (
                    <Button size="sm" asChild className="w-full">
                      <a
                        href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Olá! Tenho interesse em: ${it.name}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Tenho interesse
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10">
          Vitrine criada com <Link to="/inicio" className="underline">Gerir+</Link>
        </p>
      </main>
    </div>
  );
}
