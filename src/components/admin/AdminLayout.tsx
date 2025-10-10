import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FolderKanban,
  FileText,
  Shield,
  LogOut,
} from "lucide-react";
import { adminTranslations } from "@/constants/adminTranslations";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { title: adminTranslations.navigation.dashboard, url: "/heyadmin", icon: LayoutDashboard },
  { title: adminTranslations.navigation.entrepreneurs, url: "/heyadmin/entrepreneurs", icon: Building2 },
  { title: adminTranslations.navigation.advisors, url: "/heyadmin/advisors", icon: Briefcase },
  { title: adminTranslations.navigation.projects, url: "/heyadmin/projects", icon: FolderKanban },
  { title: adminTranslations.navigation.rfps, url: "/heyadmin/rfps", icon: FileText },
  { title: adminTranslations.navigation.users, url: "/heyadmin/users", icon: Users },
  { title: adminTranslations.navigation.auditLog, url: "/heyadmin/audit", icon: Shield },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/heyadmin/login");
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent className="bg-sidebar">
        <div className="p-4 border-b">
          {!isCollapsed && (
            <h2 className="text-xl font-bold">{adminTranslations.navigation.adminPanel}</h2>
          )}
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>{adminTranslations.navigation.management}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.url;
                
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 ml-2" />
            {!isCollapsed && <span>{adminTranslations.navigation.signOut}</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1">
          <header className="h-14 border-b flex items-center px-6">
            <SidebarTrigger />
          </header>
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
