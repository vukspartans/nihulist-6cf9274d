import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Star, BarChart3, AlertTriangle } from "lucide-react";
import {
  useFeeTemplateCategories,
  useCreateFeeCategory,
  useUpdateFeeCategory,
  useDeleteFeeCategory,
} from "@/hooks/useFeeTemplateHierarchy";
import { supabase } from "@/integrations/supabase/client";
import { CreateFeeCategoryDialog } from "@/components/admin/CreateFeeCategoryDialog";
import { EditFeeCategoryDialog } from "@/components/admin/EditFeeCategoryDialog";
import { getIndexLabel } from "@/constants/indexTypes";
import type { FeeTemplateCategory } from "@/types/feeTemplateHierarchy";

function useOrphanTemplateCount(advisorSpecialty: string) {
  return useQuery({
    queryKey: ["orphan-templates", advisorSpecialty],
    queryFn: async () => {
      const [fees, services, milestones] = await Promise.all([
        supabase.from("default_fee_item_templates").select("id", { count: "exact", head: true })
          .eq("advisor_specialty", advisorSpecialty).is("category_id", null),
        supabase.from("default_service_scope_templates").select("id", { count: "exact", head: true })
          .eq("advisor_specialty", advisorSpecialty).is("category_id", null),
        supabase.from("milestone_templates").select("id", { count: "exact", head: true })
          .eq("advisor_specialty", advisorSpecialty).is("category_id", null),
      ]);
      return (fees.count || 0) + (services.count || 0) + (milestones.count || 0);
    },
    staleTime: 60_000,
  });
}

export default function FeeTemplatesByAdvisorProject() {
  const { advisorType, projectType } = useParams<{
    advisorType: string;
    projectType: string;
  }>();
  const navigate = useNavigate();
  const decodedAdvisorType = decodeURIComponent(advisorType || "");
  const decodedProjectType = decodeURIComponent(projectType || "");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeTemplateCategory | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  const { data: categories, isLoading } = useFeeTemplateCategories(decodedAdvisorType, decodedProjectType);
  const { data: orphanCount } = useOrphanTemplateCount(decodedAdvisorType);
  const createMutation = useCreateFeeCategory();
  const updateMutation = useUpdateFeeCategory();
  const deleteMutation = useDeleteFeeCategory();

  const handleBack = () => {
    navigate(`/heyadmin/fee-templates/${encodeURIComponent(decodedAdvisorType)}`);
  };

  const handleCategoryClick = (category: FeeTemplateCategory) => {
    navigate(
      `/heyadmin/fee-templates/${encodeURIComponent(decodedAdvisorType)}/${encodeURIComponent(decodedProjectType)}/${category.id}`
    );
  };

  const handleSetDefault = (category: FeeTemplateCategory) => {
    updateMutation.mutate({
      id: category.id,
      is_default: true,
    });
  };

  const handleDelete = () => {
    if (deleteCategoryId) {
      deleteMutation.mutate(deleteCategoryId, {
        onSuccess: () => setDeleteCategoryId(null),
      });
    }
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
            חזרה לסוגי פרויקטים
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span>{decodedAdvisorType}</span>
                <ChevronLeft className="h-3 w-3" />
                <span>{decodedProjectType}</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                סוגי תבניות
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                בחר סוג תבנית לניהול השירותים, שורות שכ"ט ואבני דרך התשלום
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              הוסף סוג תבנית
            </Button>
          </div>
        </div>

        {/* Orphan Templates Notice */}
        {orphanCount && orphanCount > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">
                יש {orphanCount} תבניות קיימות שלא שויכו לסוג תבנית. צור סוג תבנית ושייך אותן.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Template Type Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="cursor-pointer hover:shadow-md transition-shadow border hover:border-primary/30"
                onClick={() => handleCategoryClick(category)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(category);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCategoryId(category.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      מדד: {getIndexLabel(category.default_index_type)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    {category.is_default ? (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" />
                        ברירת מחדל
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(category);
                        }}
                      >
                        <Star className="h-3 w-3 ml-1" />
                        קבע כברירת מחדל
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">אין סוגי תבניות עדיין</p>
                <p className="text-sm text-muted-foreground">
                  צור סוגי תבניות כמו "הכנת תב"ע", "הכנת מצגת לדיירים", "רישוי" וכו׳
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                הוסף סוג תבנית
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Category Dialog */}
      <CreateFeeCategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        advisorSpecialty={decodedAdvisorType}
        projectType={decodedProjectType}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => setCreateDialogOpen(false),
          });
        }}
        isLoading={createMutation.isPending}
      />

      {/* Edit Category Dialog */}
      <EditFeeCategoryDialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        category={editingCategory}
        onSubmit={(data) => {
          updateMutation.mutate(data, {
            onSuccess: () => setEditingCategory(null),
          });
        }}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={() => setDeleteCategoryId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת סוג תבנית</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את סוג התבנית? כל השירותים, שורות שכ"ט ואבני הדרך המשויכים יושפעו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
