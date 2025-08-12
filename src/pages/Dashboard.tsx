import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Trash2, Calendar, MapPin, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardStats } from "@/components/DashboardStats";
import { ActivityFeed } from "@/components/ActivityFeed";
import { QuickActions } from "@/components/QuickActions";
import { ProjectFilters } from "@/components/ProjectFilters";

interface Project {
  id: string;
  name: string;
  type: string | null;
  location: string | null;
  budget: number | null;
  timeline_start: string;
  timeline_end: string;
  status: string;
  created_at: string;
}

const statusLabels = {
  draft: "טיוטה",
  rfp_sent: "RFP נשלח",
  collecting: "איסוף הצעות",
  comparing: "השוואה",
  selected: "נבחר ספק",
  closed: "סגור",
  deleted: "נמחק"
};

const statusColors = {
  draft: "secondary",
  rfp_sent: "default",
  collecting: "accent",
  comparing: "construction",
  selected: "success",
  closed: "muted",
  deleted: "destructive"
} as const;

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
        .select("*")
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
          <Button
            onClick={() => navigate("/projects/new")}
            variant="tech"
            size="lg"
            className="mt-4 md:mt-0"
          >
            <Plus className="w-5 h-5 ml-2" />
            פרויקט חדש
          </Button>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-3">
            {/* Filters */}
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
          
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActions />
            
            {/* Activity Feed */}
            <ActivityFeed />
          </div>
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
                      <TableHead>תקציב</TableHead>
                      <TableHead>לוח זמנים</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>תאריך יצירה</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          {project.name}
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
                          <div className="flex items-center text-sm">
                            <Calendar className="w-4 h-4 ml-1 text-muted-foreground" />
                            {formatDate(project.timeline_start)} - {formatDate(project.timeline_end)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[project.status as keyof typeof statusColors]}>
                            {statusLabels[project.status as keyof typeof statusLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(project.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/projects/${project.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteProject(project.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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