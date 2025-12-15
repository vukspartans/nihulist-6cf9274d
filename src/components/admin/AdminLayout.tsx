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
  Menu,
  Bell,
  MessageSquareHeart,
} from "lucide-react";
import { adminTranslations } from "@/constants/adminTranslations";
import { UserHeader } from "@/components/UserHeader";
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
  SidebarInset,
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
  { title: adminTranslations.navigation.feedback, url: "/heyadmin/feedback", icon: MessageSquareHeart },
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
    <Sidebar 
      side="right" 
      className={isCollapsed ? "w-16" : "w-64"} 
      collapsible="icon"
    >
      <SidebarContent className="bg-gradient-to-b from-primary/5 to-accent/5 border-l">
        <div className="p-6 border-b border-border/50">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {adminTranslations.navigation.adminPanel}
                </h2>
                <p className="text-xs text-muted-foreground">ניהול מערכת</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>
        
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-2">
            {!isCollapsed && adminTranslations.navigation.management}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.url;
                
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        relative rounded-lg transition-all duration-200
                        ${isActive 
                          ? 'bg-primary/10 text-primary font-medium shadow-sm' 
                          : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                        <Icon className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span className="text-sm">{item.title}</span>}
                        {isActive && !isCollapsed && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-border/50">
          <Button
            variant="ghost"
            className={`
              w-full justify-start gap-3 text-muted-foreground hover:text-foreground
              hover:bg-destructive/10 hover:text-destructive transition-colors
              ${isCollapsed ? 'px-0 justify-center' : ''}
            `}
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>{adminTranslations.navigation.signOut}</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      {/* Sidebar must come first so its placeholder gap positions correctly */}
      <AdminSidebar />
      {/* Proper inset that respects sidebar gap and prevents overlay */}
      <SidebarInset>
        <header className="h-16 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-muted/50 transition-colors">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-muted/50 transition-colors"
              title="התראות (בקרוב)"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1 left-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </Button>
            <UserHeader />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 bg-gradient-to-br from-background via-background to-primary/[0.02] overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
