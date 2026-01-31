import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  MapPin,
  GitBranch,
  FileStack,
  ChevronDown,
  Wallet,
  Tags,
  GitPullRequest,
  Milestone,
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

// Dashboard as standalone item
const dashboardItem = { 
  title: adminTranslations.navigation.dashboard, 
  url: "/heyadmin", 
  icon: LayoutDashboard 
};

// Management items (without dashboard)
const managementItems = [
  { title: adminTranslations.navigation.entrepreneurs, url: "/heyadmin/entrepreneurs", icon: Building2 },
  { title: adminTranslations.navigation.advisors, url: "/heyadmin/advisors", icon: Briefcase },
  { title: adminTranslations.navigation.projects, url: "/heyadmin/projects", icon: FolderKanban },
  { title: adminTranslations.navigation.rfps, url: "/heyadmin/rfps", icon: FileText },
  { title: adminTranslations.navigation.rfpTemplates, url: "/heyadmin/rfp-templates", icon: FileStack },
  { title: "תבניות שכר טרחה", url: "/heyadmin/fee-templates", icon: Wallet },
  { title: adminTranslations.navigation.users, url: "/heyadmin/users", icon: Users },
  { title: adminTranslations.navigation.feedback, url: "/heyadmin/feedback", icon: MessageSquareHeart },
  { title: adminTranslations.navigation.auditLog, url: "/heyadmin/audit", icon: Shield },
];

const licensingNavigationItems = [
  { title: "עיריות", url: "/heyadmin/municipalities", icon: MapPin },
  { title: "שלבי רישוי", url: "/heyadmin/licensing-phases", icon: GitBranch },
  { title: "תבניות משימות", url: "/heyadmin/task-templates", icon: FileStack },
];

const paymentNavigationItems = [
  { title: adminTranslations.payments.categories.title, url: "/heyadmin/payment-categories", icon: Tags },
  { title: adminTranslations.payments.statuses.title, url: "/heyadmin/payment-statuses", icon: GitPullRequest },
  { title: adminTranslations.payments.milestones.title, url: "/heyadmin/milestone-templates", icon: Milestone },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Check if current route is a management route
  const isManagementRoute = managementItems.some(item => location.pathname === item.url);

  // Check if current route is a licensing route
  const isLicensingRoute = location.pathname.includes('/heyadmin/municipalities') ||
                           location.pathname.includes('/heyadmin/licensing-phases') ||
                           location.pathname.includes('/heyadmin/task-templates');
  
  // Check if current route is a payment route
  const isPaymentRoute = location.pathname.includes('/heyadmin/payment-') || 
                         location.pathname.includes('/heyadmin/milestone-templates');
  
  const [managementOpen, setManagementOpen] = useState(isManagementRoute);
  const [licensingOpen, setLicensingOpen] = useState(isLicensingRoute);
  const [paymentsOpen, setPaymentsOpen] = useState(isPaymentRoute);

  // Auto-expand when navigating to a management route
  useEffect(() => {
    if (isManagementRoute) setManagementOpen(true);
  }, [isManagementRoute]);

  // Auto-expand when navigating to a licensing route
  useEffect(() => {
    if (isLicensingRoute) setLicensingOpen(true);
  }, [isLicensingRoute]);

  // Auto-expand when navigating to a payment route
  useEffect(() => {
    if (isPaymentRoute) setPaymentsOpen(true);
  }, [isPaymentRoute]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/heyadmin/login");
  };

  const isCollapsed = state === "collapsed";

  const renderMenuItem = (item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }) => {
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
          <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
            <Icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="text-sm">{item.title}</span>}
            {isActive && !isCollapsed && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar 
      side="right" 
      className={isCollapsed ? "w-16" : "w-64"} 
      collapsible="icon"
    >
      <SidebarContent className="bg-gradient-to-b from-primary/5 to-accent/5 border-l">
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {adminTranslations.navigation.adminPanel}
                </h2>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>

        {/* Dashboard - Standalone at top */}
        <SidebarGroup className="px-3 pt-3 pb-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItem(dashboardItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management Section - Collapsible */}
        <Collapsible open={managementOpen} onOpenChange={setManagementOpen}>
          <SidebarGroup className="px-3 py-1">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-1 cursor-pointer hover:text-foreground flex items-center justify-between w-full">
                {!isCollapsed && (
                  <>
                    <span>{adminTranslations.navigation.management}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${managementOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
                {isCollapsed && <Users className="h-5 w-5 mx-auto" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {managementItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Licensing Section - Collapsible */}
        <Collapsible open={licensingOpen} onOpenChange={setLicensingOpen}>
          <SidebarGroup className="px-3 py-1">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-1 cursor-pointer hover:text-foreground flex items-center justify-between w-full">
                {!isCollapsed && (
                  <>
                    <span>{adminTranslations.licensing.sectionTitle}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${licensingOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
                {isCollapsed && <MapPin className="h-5 w-5 mx-auto" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {licensingNavigationItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Payments Section - Collapsible */}
        <Collapsible open={paymentsOpen} onOpenChange={setPaymentsOpen}>
          <SidebarGroup className="px-3 py-1">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-1 cursor-pointer hover:text-foreground flex items-center justify-between w-full">
                {!isCollapsed && (
                  <>
                    <span>{adminTranslations.payments.sectionTitle}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${paymentsOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
                {isCollapsed && <Wallet className="h-5 w-5 mx-auto" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {paymentNavigationItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Sign Out */}
        <div className="mt-auto p-3 border-t border-border/50">
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
      <AdminSidebar />
      <SidebarInset>
        <header className="h-14 border-b bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
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
        <main className="flex-1 p-4 lg:p-6 bg-gradient-to-br from-background via-background to-primary/[0.02] overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
