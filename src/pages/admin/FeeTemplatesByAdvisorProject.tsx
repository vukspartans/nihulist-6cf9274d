import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Star, BarChart3 } from "lucide-react";
import {
  useFeeTemplateCategories,
  useCreateFeeCategory,
  useUpdateFeeCategory,
  useDeleteFeeCategory,
} from "@/hooks/useFeeTemplateHierarchy";
import { CreateFeeCategoryDialog } from "@/components/admin/CreateFeeCategoryDialog";
import { EditFeeCategoryDialog } from "@/components/admin/EditFeeCategoryDialog";
import { getIndexLabel } from "@/constants/indexTypes";
import type { FeeTemplateCategory } from "@/types/feeTemplateHierarchy";

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
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/30 relative"
                onClick={() => handleCategoryClick(category)}
              >
                {category.is_default && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3" />
                      ברירת מחדל
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      מדד: {getIndexLabel(category.default_index_type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    {!category.is_default && (
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
                    <Button
                      variant="ghost"
                      size="icon"
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
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCategoryId(category.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                אין סוגי תבניות. הוסף סוג תבנית ראשון כדי להתחיל.
              </p>
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
