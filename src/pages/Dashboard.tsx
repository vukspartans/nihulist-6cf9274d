import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MoreVertical, MapPin, DollarSign, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardStats } from "@/components/DashboardStats";
import { ProjectFilters } from "@/components/ProjectFilters";
import { UserHeader } from "@/components/UserHeader";

interface Project {
  id: string;
  name: string;
  type: string | null;
  location: string | null;
  budget: number | null;
  advisors_budget: number | null;
  timeline_start: string;
  timeline_end: string;
  status: string;
  phase: string | null;
  created_at: string;
}


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
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("id, name, type, location, budget, advisors_budget, timeline_start, timeline_end, status, phase, created_at")
        .eq("owner_id", user.id)
        .neq("status", "deleted")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הפרויקטים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortBy as keyof Project];
      let bValue = b[sortBy as keyof Project];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const activeFiltersCount = (searchTerm ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
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

  if (loading) {
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
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">לוח הבקרה</h1>
            <p className="text-lg text-muted-foreground">ניהול פרויקטים ובחירת ספקים</p>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Button
              onClick={() => navigate("/projects/new")}
              variant="tech"
              size="lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              פרויקט חדש
            </Button>
            <UserHeader />
          </div>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats />

        {/* Filters */}
        <div className="mb-6">
          <ProjectFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Projects Table */}
        {filteredProjects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">אין פרויקטים</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? "לא נמצאו פרויקטים התואמים לחיפוש" : "התחל ביצירת הפרויקט הראשון שלך"}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => navigate("/projects/new")}
                  variant="tech"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  צור פרויקט חדש
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
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
                       <TableHead>סוג</TableHead>
                       <TableHead>מיקום</TableHead>
                       <TableHead>תקציב פרויקט</TableHead>
                       <TableHead>תקציב יועצים</TableHead>
                       <TableHead>תאריך יצירה</TableHead>
                       <TableHead>פעולות</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                         <TableCell className="font-medium">
                           <div className="flex items-center gap-3">
                             <div 
                               className={`w-3 h-3 min-w-[12px] min-h-[12px] rounded-full shrink-0 ${getPhaseStatusColor(project.phase)}`}
                               title={project.phase || 'לא צוין שלב'}
                             />
                             <button
                               onClick={() => handleProjectClick(project.id)}
                               className="text-left hover:text-primary transition-colors cursor-pointer"
                             >
                               {project.name}
                             </button>
                           </div>
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
                            <DollarSign className="w-4 h-4 ml-1 text-muted-foreground" />
                            {formatBudget(project.budget)}
                          </div>
                        </TableCell>
                         <TableCell>
                           <div className="flex items-center">
                             <DollarSign className="w-4 h-4 ml-1 text-muted-foreground" />
                             {formatBudget(project.advisors_budget)}
                           </div>
                         </TableCell>
                         <TableCell>{formatDate(project.created_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditProject(project.id)}>
                                <Edit className="w-4 h-4 ml-2" />
                                עריכה
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 ml-2" />
                                    מחק
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      פעולה זו תמחק את הפרויקט "{project.name}" ולא ניתן לבטל אותה.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteProject(project.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      מחק
                                    </AlertDialogAction>
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
      </div>
    </div>
  );
};

export default Dashboard;