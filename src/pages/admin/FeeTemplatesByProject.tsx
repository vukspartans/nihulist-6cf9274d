import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useProjectTypeSummary } from "@/hooks/useFeeTemplateHierarchy";
import { PROJECT_TYPES } from "@/constants/project";
import { Folder, ChevronLeft, ChevronRight } from "lucide-react";

export default function FeeTemplatesByProject() {
  const { advisorType } = useParams<{ advisorType: string }>();
  const navigate = useNavigate();
  const decodedAdvisorType = decodeURIComponent(advisorType || "");
  
  const { data: summaries, isLoading } = useProjectTypeSummary(decodedAdvisorType);

  // Combine DB data with all available project types and sort by activity
  const projectTypes = PROJECT_TYPES.map((type) => {
    const summary = summaries?.find((s) => s.project_type === type);
    return {
      project_type: type,
      category_count: summary?.category_count || 0,
    };
  }).sort((a, b) => {
    // First by category count (descending) - active projects first
    if (b.category_count !== a.category_count) {
      return b.category_count - a.category_count;
    }
    // Then alphabetically by name
    return a.project_type.localeCompare(b.project_type, 'he');
  });

  const handleProjectClick = (projectType: string) => {
    navigate(`/heyadmin/fee-templates/${encodeURIComponent(decodedAdvisorType)}/${encodeURIComponent(projectType)}`);
  };

  const handleBack = () => {
    navigate("/heyadmin/fee-templates");
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Breadcrumb & Header */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            חזרה לסוגי יועצים
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {decodedAdvisorType}
              </h1>
              <p className="text-muted-foreground mt-1">
                בחר סוג פרויקט לניהול תבניות
              </p>
            </div>
          </div>
        </div>

        {/* Project Type Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectTypes.map((project) => (
              <Card
                key={project.project_type}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => handleProjectClick(project.project_type)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-primary" />
                      <span>{project.project_type}</span>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-end">
                    <Badge variant={project.category_count > 0 ? "default" : "secondary"}>
                      {project.category_count > 0 ? "פעיל" : "טרם הוגדר"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
