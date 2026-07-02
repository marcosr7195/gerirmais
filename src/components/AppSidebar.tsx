import { LayoutDashboard, DollarSign, Handshake, ClipboardList, LogOut, Settings, Store, Megaphone, Shield, Wallet, CreditCard, Briefcase, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import logoCompleta from "@/assets/logo-completa.png";
import iconG from "@/assets/icon-g.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const PERSONAL_COLOR = "#8B5CF6";

const businessItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Vitrine", url: "/vitrine", icon: Store },
  { title: "Marketing", url: "/marketing", icon: Megaphone },
  { title: "Vendas", url: "/vendas", icon: Handshake },
  { title: "Entregáveis", url: "/entregas", icon: ClipboardList },
  { title: "Finanças", url: "/financas", icon: DollarSign },
];

const personalItems = [
  { title: "Finanças Pessoal", url: "/financas-pessoal", icon: Wallet },
  { title: "Cartões de Crédito", url: "/cartoes", icon: CreditCard },
];

interface SidebarSectionHeaderProps {
  title: string;
  icon: React.ElementType;
  isPersonal?: boolean;
  collapsed?: boolean;
}

function SidebarSectionHeader({ title, icon: Icon, isPersonal, collapsed }: SidebarSectionHeaderProps) {
  if (collapsed) {
    return (
      <div className="px-4 py-2 flex justify-center">
        <Icon className={cn("h-3.5 w-3.5", isPersonal ? "text-[#8B5CF6]" : "text-sidebar-foreground/60")} />
      </div>
    );
  }

  return (
    <div className={cn("px-4 py-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", isPersonal ? "text-[#8B5CF6]" : "text-sidebar-foreground/60")}>
      <Icon className="h-3.5 w-3.5" />
      <span>{title}</span>
    </div>
  );
}

interface SidebarItemProps {
  item: (typeof businessItems)[number];
  isPersonal?: boolean;
  collapsed?: boolean;
}

function SidebarItem({ item, isPersonal, collapsed }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url));

  return (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild isActive={isActive}>
        <NavLink
          to={item.url}
          end={item.url === "/"}
          className={cn(
            "hover:bg-sidebar-accent/50",
            isPersonal && "text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
          )}
          activeClassName={cn(
            "font-medium",
            isPersonal ? "bg-[#8B5CF6]/20 text-[#8B5CF6]" : "bg-sidebar-accent text-sidebar-accent-foreground"
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, profile, user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === "marcos7195@gmail.com";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`p-4 ${collapsed ? "px-2" : ""}`}>
          <div className="flex items-center gap-2">
            {collapsed ? (
              <img src={iconG} alt="Gerir+" className="w-8 h-8 rounded-lg shrink-0" />
            ) : (
              <div className="min-w-0 flex-1">
                <img src={logoCompleta} alt="Gerir+" className="h-10 w-auto object-contain" />
                <p className="text-sidebar-foreground/60 text-xs truncate mt-1">{profile?.business_name || "Meu Negócio"}</p>
              </div>
            )}
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarSectionHeader title="Meu Negócio" icon={Briefcase} collapsed={collapsed} />
              {businessItems.map((item) => (
                <SidebarItem key={item.title} item={item} collapsed={collapsed} />
              ))}

              <Separator className="my-3 bg-sidebar-border" />

              <SidebarSectionHeader title="Pessoal" icon={User} isPersonal collapsed={collapsed} />
              {personalItems.map((item) => (
                <SidebarItem key={item.title} item={item} isPersonal collapsed={collapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/configuracoes"
                className="hover:bg-sidebar-accent/50"
                activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              >
                <Settings className="mr-2 h-4 w-4" />
                {!collapsed && <span>Configurações</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/admin" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                  <Shield className="mr-2 h-4 w-4" />
                  {!collapsed && <span>Admin</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="hover:bg-sidebar-accent/50">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
