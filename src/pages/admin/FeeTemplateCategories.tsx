import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFeeTemplateCategories,
  useCreateFeeCategory,
  useUpdateFeeCategory,
  useDeleteFeeCategory,
} from "@/hooks/useFeeTemplateHierarchy";
import { CreateFeeCategoryDialog } from "@/components/admin/CreateFeeCategoryDialog";
import { EditFeeCategoryDialog } from "@/components/admin/EditFeeCategoryDialog";
import { Layers, ChevronLeft, ChevronRight, Plus, Trash2, Star, Pencil, TrendingUp } from "lucide-react";
import { getIndexLabel } from "@/constants/indexTypes";
import type { FeeTemplateCategory } from "@/types/feeTemplateHierarchy";
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

export default function FeeTemplateCategories() {
  const { advisorType, projectType } = useParams<{ advisorType: string; projectType: string }>();
  const navigate = useNavigate();
  const decodedAdvisorType = decodeURIComponent(advisorType || "");
  const decodedProjectType = decodeURIComponent(projectType || "");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<FeeTemplateCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: categories, isLoading } = useFeeTemplateCategories(
    decodedAdvisorType,
    decodedProjectType
  );
  const createMutation = useCreateFeeCategory();
  const updateMutation = useUpdateFeeCategory();
  const deleteMutation = useDeleteFeeCategory();

  const handleCategoryClick = (categoryId: string) => {
    navigate(
      `/heyadmin/fee-templates/${encodeURIComponent(decodedAdvisorType)}/${encodeURIComponent(decodedProjectType)}/${categoryId}`
    );
  };

  const handleBack = () => {
    navigate(`/heyadmin/fee-templates/${encodeURIComponent(decodedAdvisorType)}`);
  };

  const handleToggleDefault = (categoryId: string, currentDefault: boolean) => {
    updateMutation.mutate({ id: categoryId, is_default: !currentDefault });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
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
                קטגוריות תבניות
              </h1>
              <p className="text-muted-foreground mt-1">
                נהל קטגוריות עבודה והגדר ברירת מחדל
              </p>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              הוסף קטגוריה
            </Button>
          </div>
        </div>

        {/* Categories List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="space-y-3">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="hover:border-primary/50 transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => handleCategoryClick(category.id)}
                    >
                      <Layers className="h-5 w-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          {category.is_default && (
                            <Badge variant="secondary" className="gap-1">
                              <Star className="h-3 w-3" />
                              ברירת מחדל
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          <span>מדד: {getIndexLabel(category.default_index_type)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          לחץ לצפייה בשיטות הגשה
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          ברירת מחדל
                        </span>
                        <Switch
                          checked={category.is_default}
                          onCheckedChange={() =>
                            handleToggleDefault(category.id, category.is_default)
                          }
                          disabled={updateMutation.isPending}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditCategory(category);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(category.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">אין קטגוריות</h3>
            <p className="text-muted-foreground mb-4">
              צור קטגוריה ראשונה כדי להתחיל
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              הוסף קטגוריה
            </Button>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
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

      {/* Edit Dialog */}
      <EditFeeCategoryDialog
        open={!!editCategory}
        onOpenChange={(open) => !open && setEditCategory(null)}
        category={editCategory}
        onSubmit={(data) => {
          updateMutation.mutate(data, {
            onSuccess: () => setEditCategory(null),
          });
        }}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קטגוריה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הקטגוריה? פעולה זו תמחק גם את כל שיטות ההגשה והתבניות המשויכות.
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
