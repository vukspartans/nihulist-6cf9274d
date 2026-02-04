import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFeeTemplateCategories,
  useFeeSubmissionMethods,
  useCreateSubmissionMethod,
  useUpdateSubmissionMethod,
  useDeleteSubmissionMethod,
} from "@/hooks/useFeeTemplateHierarchy";
import { useFeeItemTemplates, useDeleteFeeItemTemplate } from "@/hooks/useRFPTemplatesAdmin";
import { CreateSubmissionMethodDialog } from "@/components/admin/CreateSubmissionMethodDialog";
import { CreateFeeItemTemplateDialog } from "@/components/admin/CreateFeeItemTemplateDialog";
import { CategoryServicesTab } from "@/components/admin/CategoryServicesTab";
import { CategoryMilestonesTab } from "@/components/admin/CategoryMilestonesTab";
import { METHOD_TYPE_LABELS } from "@/types/feeTemplateHierarchy";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Plus, Trash2, Star, Pencil, FileText, Briefcase, Milestone } from "lucide-react";
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

export default function FeeTemplateSubmissionMethods() {
  const { advisorType, projectType, categoryId } = useParams<{
    advisorType: string;
    projectType: string;
    categoryId: string;
  }>();
  const navigate = useNavigate();
  const decodedAdvisorType = decodeURIComponent(advisorType || "");
  const decodedProjectType = decodeURIComponent(projectType || "");

  const [createMethodDialogOpen, setCreateMethodDialogOpen] = useState(false);
  const [createItemDialogOpen, setCreateItemDialogOpen] = useState(false);
  const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<string>("fee-items");

  // Fetch category details
  const { data: categories } = useFeeTemplateCategories(
    decodedAdvisorType,
    decodedProjectType
  );
  const category = categories?.find((c) => c.id === categoryId);

  // Fetch submission methods
  const { data: methods, isLoading: methodsLoading } = useFeeSubmissionMethods(categoryId);
  const createMethodMutation = useCreateSubmissionMethod();
  const updateMethodMutation = useUpdateSubmissionMethod();
  const deleteMethodMutation = useDeleteSubmissionMethod();

  // Set first method as selected if none selected (must be defined before use in hook)
  const activeMethodId = selectedMethodId || methods?.[0]?.id;

  // Fetch fee items for selected method (filter by submission_method_id when available)
  const { data: feeItems, isLoading: itemsLoading } = useFeeItemTemplates(
    decodedAdvisorType,
    activeMethodId || undefined
  );
  const deleteItemMutation = useDeleteFeeItemTemplate();

  // Items are now pre-filtered by the hook, no additional filtering needed
  const filteredItems = feeItems || [];

  const handleBack = () => {
    navigate(
      `/heyadmin/fee-templates/${encodeURIComponent(decodedAdvisorType)}/${encodeURIComponent(decodedProjectType)}`
    );
  };

  const handleToggleMethodDefault = (methodId: string, currentDefault: boolean) => {
    updateMethodMutation.mutate({
      id: methodId,
      is_default: !currentDefault,
      category_id: categoryId,
    });
  };

  const handleDeleteMethod = () => {
    if (deleteMethodId) {
      deleteMethodMutation.mutate(deleteMethodId, {
        onSuccess: () => setDeleteMethodId(null),
      });
    }
  };

  const handleDeleteItem = () => {
    if (deleteItemId) {
      deleteItemMutation.mutate(deleteItemId, {
        onSuccess: () => setDeleteItemId(null),
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
            חזרה לקטגוריות
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span>{decodedAdvisorType}</span>
                <ChevronLeft className="h-3 w-3" />
                <span>{decodedProjectType}</span>
                <ChevronLeft className="h-3 w-3" />
                <span>{category?.name || "..."}</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                שיטות הגשה ותבניות
              </h1>
            </div>
            <Button onClick={() => setCreateMethodDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              הוסף שיטת הגשה
            </Button>
          </div>
        </div>

        {/* Methods Tabs (Submission Methods) */}
        {methodsLoading ? (
          <Skeleton className="h-48" />
        ) : methods && methods.length > 0 ? (
          <Tabs
            value={activeMethodId}
            onValueChange={setSelectedMethodId}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <TabsList className="h-auto p-1">
                {methods.map((method) => (
                  <TabsTrigger
                    key={method.id}
                    value={method.id}
                    className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {method.method_label}
                    {method.is_default && <Star className="h-3 w-3" />}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex items-center gap-2">
                {activeMethodId && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const method = methods.find((m) => m.id === activeMethodId);
                        if (method) {
                          handleToggleMethodDefault(method.id, method.is_default);
                        }
                      }}
                      disabled={updateMethodMutation.isPending}
                    >
                      {methods.find((m) => m.id === activeMethodId)?.is_default
                        ? "הסר ברירת מחדל"
                        : "הגדר כברירת מחדל"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setDeleteMethodId(activeMethodId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {methods.map((method) => (
              <TabsContent key={method.id} value={method.id} className="space-y-4">
                {/* Content Tabs: Fee Items, Services, Milestones */}
                <Tabs value={contentTab} onValueChange={setContentTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="fee-items" className="gap-2">
                      <FileText className="h-4 w-4" />
                      שורות סעיפים
                    </TabsTrigger>
                    <TabsTrigger value="services" className="gap-2">
                      <Briefcase className="h-4 w-4" />
                      שירותים
                    </TabsTrigger>
                    <TabsTrigger value="milestones" className="gap-2">
                      <Milestone className="h-4 w-4" />
                      אבני דרך
                    </TabsTrigger>
                  </TabsList>

                  {/* Fee Items Tab */}
                  <TabsContent value="fee-items">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">שורות סעיפים</CardTitle>
                        <Button
                          size="sm"
                          onClick={() => setCreateItemDialogOpen(true)}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          הוסף שורה
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {itemsLoading ? (
                          <Skeleton className="h-32" />
                        ) : filteredItems.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-right">תיאור</TableHead>
                                <TableHead className="text-right">יחידה</TableHead>
                                <TableHead className="text-right">כמות ברירת מחדל</TableHead>
                                <TableHead className="text-right">סוג חיוב</TableHead>
                                <TableHead className="text-right">אופציונלי</TableHead>
                                <TableHead className="w-24"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredItems.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                    {item.description}
                                  </TableCell>
                                  <TableCell>{item.unit}</TableCell>
                                  <TableCell>{item.default_quantity || "-"}</TableCell>
                                  <TableCell>{item.charge_type || "-"}</TableCell>
                                  <TableCell>
                                    {item.is_optional ? (
                                      <Badge variant="secondary">אופציונלי</Badge>
                                    ) : (
                                      <Badge variant="default">חובה</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="icon">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => setDeleteItemId(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>אין שורות סעיפים. הוסף שורה ראשונה כדי להתחיל.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Services Tab */}
                  <TabsContent value="services">
                    <Card>
                      <CardContent className="pt-6">
                        {categoryId && (
                          <CategoryServicesTab
                            categoryId={categoryId}
                            advisorSpecialty={decodedAdvisorType}
                            projectType={decodedProjectType}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Milestones Tab */}
                  <TabsContent value="milestones">
                    <Card>
                      <CardContent className="pt-6">
                        {categoryId && (
                          <CategoryMilestonesTab
                            categoryId={categoryId}
                            advisorSpecialty={decodedAdvisorType}
                            projectType={decodedProjectType}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-medium mb-2">אין שיטות הגשה</h3>
            <p className="text-muted-foreground mb-4">
              צור שיטת הגשה ראשונה (פאושלי, כמותי, או שעתי)
            </p>
            <Button onClick={() => setCreateMethodDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              הוסף שיטת הגשה
            </Button>
          </Card>
        )}
      </div>

      {/* Create Method Dialog */}
      <CreateSubmissionMethodDialog
        open={createMethodDialogOpen}
        onOpenChange={setCreateMethodDialogOpen}
        categoryId={categoryId || ""}
        onSubmit={(data) => {
          createMethodMutation.mutate(data, {
            onSuccess: () => setCreateMethodDialogOpen(false),
          });
        }}
        isLoading={createMethodMutation.isPending}
      />

      {/* Create Fee Item Dialog */}
      <CreateFeeItemTemplateDialog
        open={createItemDialogOpen}
        onOpenChange={setCreateItemDialogOpen}
        defaultAdvisorSpecialty={decodedAdvisorType}
      />

      {/* Delete Method Confirmation */}
      <AlertDialog open={!!deleteMethodId} onOpenChange={() => setDeleteMethodId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שיטת הגשה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את שיטת ההגשה? פעולה זו תמחק גם את כל השורות המשויכות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMethod}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שורה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את השורה?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
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
