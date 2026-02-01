import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MoreVertical, MapPin, Coins, Edit, Trash2, FileText, Calendar } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardStats } from "@/components/DashboardStats";
import { ProjectFilters } from "@/components/ProjectFilters";
import { UserHeader } from "@/components/UserHeader";
import { ProjectSummary } from "@/types/project";
import NavigationLogo from "@/components/NavigationLogo";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import BackToTop from '@/components/BackToTop';
import { useIsMobile } from "@/hooks/use-mobile";
import LegalFooter from "@/components/LegalFooter";


const getPhaseStatusColor = (phase: string | null) => {
  if (!phase) return 'bg-muted-foreground';
  
  // Planning phases - Orange
  if (phase.includes('תכנון') || phase.includes('הערכה') || phase.includes('סקר')) {
    return 'bg-orange-500';
  }
  
  // Active/execution phases - Green  
  if (phase.includes('ביצוע') || phase.includes('פיקוח') || phase.includes('מערכות')) {
    return 'bg-green-500';
  }
  
  // Completed/closed phases - Red
  if (phase.includes('סגור') || phase.includes('הושלם') || phase.includes('סיום')) {
    return 'bg-red-500';
  }
  
  // Default to orange for planning
  return 'bg-orange-500';
};


const Dashboard = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [unseenProposalCounts, setUnseenProposalCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const { needsOnboarding, loading: orgLoading } = useOrganization();
  const isMobile = useIsMobile();

  // Redirect to onboarding if entrepreneur hasn't completed it
  useEffect(() => {
    if (!authLoading && !orgLoading && user && profile) {
      // Check if user explicitly skipped onboarding via localStorage
      const onboardingSkipped = localStorage.getItem('onboarding_skipped') === 'true';
      
      if ((profile as any).role === 'entrepreneur' && needsOnboarding() && !onboardingSkipped) {
        console.info('[Dashboard] Redirecting to organization onboarding');
        navigate('/organization/onboarding', { replace: true });
      }
    }
  }, [authLoading, orgLoading, user, profile, needsOnboarding, navigate]);

  // SECURITY: Client-side role check removed - handled by RoleBasedRoute guard in App.tsx

  useEffect(() => {
    const initializeDashboard = async () => {
      console.info('[Dashboard] useEffect triggered', { authLoading, hasUser: !!user, userId: user?.id });
      
      if (authLoading) {
        console.info('[Dashboard] ⏸️ Waiting for auth to complete');
        return;
      }

      if (!user) {
        console.info('[Dashboard] ⏸️ No user available yet');
        return;
      }

      // CRITICAL: Wait for Supabase client to have a valid session
      // This ensures auth.uid() in RLS policies will work correctly
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.info('[Dashboard] Session check:', { 
        hasSession: !!session, 
        sessionUserId: session?.user?.id,
        expectedUserId: user.id,
        sessionMatch: session?.user?.id === user.id 
      });

      if (sessionError) {
        console.error('[Dashboard] ❌ Session error:', sessionError);
        toast({
          title: "שגיאת הרשאה",
          description: "אירעה שגיאה באימות. נא להתחבר מחדש.",
          variant: "destructive",
        });
        return;
      }

      if (!session || session.user.id !== user.id) {
        console.warn('[Dashboard] ⚠️ Session mismatch or missing - waiting for sync');
        // Wait a bit for session to sync and retry
        setTimeout(() => {
          console.info('[Dashboard] Retrying after session sync delay');
          initializeDashboard();
        }, 500);
        return;
      }

      console.info('[Dashboard] ✅ Session verified, fetching projects');
      fetchProjects();
    };

    initializeDashboard();
  }, [user, authLoading]);

  const fetchProjects = async () => {
    if (!user) {
      console.warn('[Dashboard] No user available for fetching projects');
      return;
    }

    try {
      console.info('[Dashboard] Fetching projects for user:', user.id);
      
      // Double-check session before query
      const { data: { session } } = await supabase.auth.getSession();
      console.info('[Dashboard] Pre-query session check:', { 
        hasSession: !!session,
        sessionUserId: session?.user?.id 
      });
      
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, type, location, budget, advisors_budget, timeline_start, timeline_end, status, phase, created_at")
        .eq("owner_id", user.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('[Dashboard] ❌ Query error:', error);
        throw error;
      }
      
      console.info('[Dashboard] ✅ Projects loaded:', data?.length || 0, 'projects');
      if (data && data.length > 0) {
        console.info('[Dashboard] First project:', data[0].name);
      }
      setProjects(data || []);
      
      // Fetch unseen proposal counts for all projects
      if (data && data.length > 0) {
        fetchUnseenProposalCounts(data.map(p => p.id));
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הפרויקטים",
        variant: "destructive",
      });
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchUnseenProposalCounts = async (projectIds: string[]) => {
    try {
      // Calculate 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('proposals')
        .select('project_id')
        .in('project_id', projectIds)
        .is('seen_by_entrepreneur_at', null)
        .eq('status', 'submitted')
        .gte('submitted_at', twentyFourHoursAgo.toISOString()); // Within last 24 hours

      if (error) {
        console.error('[Dashboard] Error fetching unseen proposal counts:', error);
        return;
      }

      // Group by project_id and count
      const counts: Record<string, number> = {};
      data?.forEach(p => {
        counts[p.project_id] = (counts[p.project_id] || 0) + 1;
      });
      
      console.info('[Dashboard] Unseen proposal counts (24h + unseen):', counts);
      setUnseenProposalCounts(counts);
    } catch (error) {
      console.error('[Dashboard] Error in fetchUnseenProposalCounts:', error);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: "deleted" })
        .eq("id", projectId);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== projectId));
      toast({
        title: "הפרויקט נמחק",
        description: "הפרויקט נמחק בהצלחה",
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה במחיקת הפרויקט",
        variant: "destructive",
      });
    }
  };

  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPhase = phaseFilter === "all" || project.phase === phaseFilter;
      return matchesSearch && matchesPhase;
    })
    .sort((a, b) => {
      // Priority 1: Projects with unseen proposals come first
      const aHasUnseen = (unseenProposalCounts[a.id] || 0) > 0;
      const bHasUnseen = (unseenProposalCounts[b.id] || 0) > 0;
      if (aHasUnseen !== bHasUnseen) {
        return aHasUnseen ? -1 : 1; // Unseen first
      }
      
      // Priority 2: User's selected sort
      let aValue = a[sortBy as keyof ProjectSummary];
      let bValue = b[sortBy as keyof ProjectSummary];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const activeFiltersCount = (searchTerm ? 1 : 0) + (phaseFilter !== "all" ? 1 : 0);

  const handleClearFilters = () => {
    setSearchTerm("");
    setPhaseFilter("all");
    setSortBy("created_at");
    setSortOrder("desc");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  const formatBudget = (budget: number | null) => {
    if (!budget) return "לא צוין";
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    }).format(budget);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleEditProject = (projectId: string) => {
    navigate(`/projects/${projectId}?edit=true`);
  };

  if (authLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">טוען פרויקטים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="sticky top-0 z-50 bg-background p-3 md:p-6 border-b">
        <div className="flex items-center justify-between gap-2">
          <NavigationLogo size="sm" className="flex-shrink-0" />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/projects/new")}
              variant="tech"
              size="sm"
              className="whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4 ml-1" />
              <span className="hidden sm:inline">פרויקט חדש</span>
              <span className="sm:hidden">חדש</span>
            </Button>
            <UserHeader />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">לוח הבקרה</h1>
            <p className="text-lg text-muted-foreground">ניהול פרויקטים ובחירת ספקים</p>
          </div>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats />

        {/* Filters */}
        <div className="mb-6">
          <ProjectFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={phaseFilter}
            onStatusFilterChange={setPhaseFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Projects Display */}
        {filteredProjects.length === 0 ? (
          <Card className="text-center py-8 md:py-12">
            <CardContent>
              <div className="w-16 h-16 md:w-24 md:h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-2">אין פרויקטים</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-6">
                {searchTerm ? "לא נמצאו פרויקטים התואמים לחיפוש" : "התחל ביצירת הפרויקט הראשון שלך"}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => navigate("/projects/new")}
                  variant="tech"
                  size={isMobile ? "sm" : "default"}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  צור פרויקט חדש
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile Card Layout */}
            {isMobile ? (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-2">
                  {filteredProjects.length} פרויקטים
                </div>
                {filteredProjects.map((project) => (
                  <Card 
                    key={project.id} 
                    onClick={() => handleProjectClick(project.id)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <CardContent className="p-4">
                      {/* Header: Name + Actions */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{project.name}</h3>
                          <Badge 
                            variant="outline" 
                            className={`${getPhaseStatusColor(project.phase)} text-white border-0 mt-1 text-xs`}
                          >
                            {project.phase || "לא צוין"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* New proposals badge */}
                          {(unseenProposalCounts[project.id] || 0) > 0 && (
                            <div 
                              className="relative animate-pulse"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projects/${project.id}?tab=received`);
                              }}
                            >
                              <FileText className="w-5 h-5 text-primary" />
                              <Badge 
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1.5 text-[11px] flex items-center justify-center animate-bounce"
                              >
                                {unseenProposalCounts[project.id] > 99 ? '99+' : unseenProposalCounts[project.id]}
                              </Badge>
                            </div>
                          )}
                          {/* Actions dropdown */}
                          <DropdownMenu dir="rtl">
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="text-right">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEditProject(project.id);
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                עריכה
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    מחק
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent dir="rtl">
                                  <AlertDialogHeader className="text-right">
                                    <AlertDialogTitle className="text-right">האם אתה בטוח?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-right">
                                      פעולה זו תמחק את הפרויקט "{project.name}" ולא ניתן לבטל אותה.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2 sm:gap-2">
                                    <AlertDialogAction
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteProject(project.id);
                                      }}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      מחק
                                    </AlertDialogAction>
                                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{project.location || "לא צוין"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{formatBudget(project.budget)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatDate(project.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <span className="truncate">{project.type || "לא צוין"}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Desktop Table Layout */
              <Card>
                <CardHeader>
                  <CardTitle>הפרויקטים שלי</CardTitle>
                  <CardDescription>
                    {filteredProjects.length} פרויקטים
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>שם הפרויקט</TableHead>
                          <TableHead>שלב</TableHead>
                          <TableHead>סוג</TableHead>
                          <TableHead>מיקום</TableHead>
                          <TableHead>תקציב פרויקט</TableHead>
                          <TableHead>תקציב יועצים</TableHead>
                          <TableHead>תאריך יצירה</TableHead>
                          <TableHead>הצעות חדשות</TableHead>
                          <TableHead>פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjects.map((project) => (
                          <TableRow 
                            key={project.id}
                            onClick={() => handleProjectClick(project.id)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <TableCell className="font-medium">
                              <button
                                onClick={() => handleProjectClick(project.id)}
                                className="text-right hover:text-primary transition-colors cursor-pointer text-start"
                              >
                                {project.name}
                              </button>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`${getPhaseStatusColor(project.phase)} text-white border-0`}
                              >
                                {project.phase || "לא צוין"}
                              </Badge>
                            </TableCell>
                            <TableCell>{project.type || "לא צוין"}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 ml-1 text-muted-foreground" />
                                {project.location || "לא צוין"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Coins className="w-4 h-4 ml-1 text-muted-foreground" />
                                {formatBudget(project.budget)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Coins className="w-4 h-4 ml-1 text-muted-foreground" />
                                {formatBudget(project.advisors_budget)}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(project.created_at)}</TableCell>
                            <TableCell 
                              onClick={(e) => {
                                e.stopPropagation();
                                const count = unseenProposalCounts[project.id] || 0;
                                if (count > 0) {
                                  navigate(`/projects/${project.id}?tab=received`);
                                }
                              }}
                            >
                              {(unseenProposalCounts[project.id] || 0) > 0 && (
                                <div className="flex items-center justify-center cursor-pointer">
                                  <div className="relative">
                                    <FileText className="w-5 h-5 text-primary" />
                                    <Badge 
                                      variant="destructive"
                                      className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 text-xs flex items-center justify-center"
                                    >
                                      {unseenProposalCounts[project.id] > 99 ? '99+' : unseenProposalCounts[project.id]}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu dir="rtl">
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="text-right">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditProject(project.id);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    עריכה
                                  </DropdownMenuItem>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        מחק
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                      <AlertDialogHeader className="text-right">
                                        <AlertDialogTitle className="text-right">האם אתה בטוח?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-right">
                                          פעולה זו תמחק את הפרויקט "{project.name}" ולא ניתן לבטל אותה.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="gap-2 sm:gap-2">
                                        <AlertDialogAction
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteProject(project.id);
                                          }}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          מחק
                                        </AlertDialogAction>
                                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      <LegalFooter />
      <BackToTop />
    </div>
  );
};

export default Dashboard;