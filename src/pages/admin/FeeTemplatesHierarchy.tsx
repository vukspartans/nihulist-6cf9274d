import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdvisorTypeSummary } from "@/hooks/useFeeTemplateHierarchy";
import { ADVISOR_EXPERTISE } from "@/constants/advisor";
import { FileStack, ChevronLeft, Plus } from "lucide-react";

export default function FeeTemplatesHierarchy() {
  const navigate = useNavigate();
  const { data: summaries, isLoading } = useAdvisorTypeSummary();

  // Combine DB data with all available advisor types
  const advisorTypes = ADVISOR_EXPERTISE.map((type) => {
    const summary = summaries?.find((s) => s.advisor_specialty === type);
    return {
      advisor_specialty: type,
      category_count: summary?.category_count || 0,
      template_count: summary?.template_count || 0,
    };
  });

  const handleAdvisorClick = (advisorType: string) => {
    navigate(`/heyadmin/fee-templates/${encodeURIComponent(advisorType)}`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              ניהול תבניות קריאה להצעה
            </h1>
            <p className="text-muted-foreground mt-1">
              בחר סוג יועץ לצפייה בתבניות
            </p>
          </div>
        </div>

        {/* Advisor Type Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advisorTypes.map((advisor) => (
              <Card
                key={advisor.advisor_specialty}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => handleAdvisorClick(advisor.advisor_specialty)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <FileStack className="h-5 w-5 text-primary" />
                      <span>{advisor.advisor_specialty}</span>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {advisor.template_count > 0 ? (
                      <span>{advisor.template_count} תבניות</span>
                    ) : (
                      <span className="text-muted-foreground/60">טרם הוגדרו תבניות</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State for no advisors */}
        {!isLoading && advisorTypes.length === 0 && (
          <Card className="p-8 text-center">
            <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">אין סוגי יועצים מוגדרים</h3>
            <p className="text-muted-foreground mb-4">
              הוסף סוגי יועצים במערכת כדי להתחיל ליצור תבניות
            </p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
