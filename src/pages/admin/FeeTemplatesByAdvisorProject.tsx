import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, FileText, Briefcase, Milestone } from "lucide-react";
import {
  useFeeItemTemplatesByAdvisorProject,
  useServiceScopeTemplatesByAdvisorProject,
  useDeleteFeeItemTemplate,
  useDeleteServiceScopeTemplate,
  FeeItemTemplate,
  ServiceScopeTemplate,
} from "@/hooks/useRFPTemplatesAdmin";
import {
  useMilestoneTemplatesByAdvisorProject,
  useDeleteMilestoneTemplate,
} from "@/hooks/useMilestoneTemplates";
import { CreateFeeItemTemplateDialog } from "@/components/admin/CreateFeeItemTemplateDialog";
import { EditFeeItemTemplateDialog } from "@/components/admin/EditFeeItemTemplateDialog";
import { CreateServiceScopeTemplateDialog } from "@/components/admin/CreateServiceScopeTemplateDialog";
import { EditServiceScopeTemplateDialog } from "@/components/admin/EditServiceScopeTemplateDialog";
import { CreateMilestoneTemplateDialog } from "@/components/admin/CreateMilestoneTemplateDialog";
import { EditMilestoneTemplateDialog } from "@/components/admin/EditMilestoneTemplateDialog";
import { TRIGGER_TYPES, type MilestoneTemplate } from "@/types/milestoneTemplate";

export default function FeeTemplatesByAdvisorProject() {
  const { advisorType, projectType } = useParams<{
    advisorType: string;
    projectType: string;
  }>();
  const navigate = useNavigate();
  const decodedAdvisorType = decodeURIComponent(advisorType || "");
  const decodedProjectType = decodeURIComponent(projectType || "");

  const [activeTab, setActiveTab] = useState<string>("fee-items");

  // Fee Items state
  const [createFeeItemDialogOpen, setCreateFeeItemDialogOpen] = useState(false);
  const [editingFeeItem, setEditingFeeItem] = useState<FeeItemTemplate | null>(null);
  const [deleteFeeItemId, setDeleteFeeItemId] = useState<string | null>(null);

  // Services state
  const [createServiceDialogOpen, setCreateServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceScopeTemplate | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);

  // Milestones state
  const [createMilestoneDialogOpen, setCreateMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneTemplate | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);

  // Fetch data using new hooks (filter by advisor + project type)
  const { data: feeItems, isLoading: feeItemsLoading } = useFeeItemTemplatesByAdvisorProject(
    decodedAdvisorType,
    decodedProjectType
  );
  const { data: services, isLoading: servicesLoading } = useServiceScopeTemplatesByAdvisorProject(
    decodedAdvisorType,
    decodedProjectType
  );
  const { data: milestones, isLoading: milestonesLoading } = useMilestoneTemplatesByAdvisorProject(
    decodedAdvisorType,
    decodedProjectType
  );

  // Delete mutations
  const deleteFeeItemMutation = useDeleteFeeItemTemplate();
  const deleteServiceMutation = useDeleteServiceScopeTemplate();
  const deleteMilestoneMutation = useDeleteMilestoneTemplate();

  const handleBack = () => {
    navigate(`/heyadmin/fee-templates/${encodeURIComponent(decodedAdvisorType)}`);
  };

  const handleDeleteFeeItem = () => {
    if (deleteFeeItemId) {
      deleteFeeItemMutation.mutate(deleteFeeItemId, {
        onSuccess: () => setDeleteFeeItemId(null),
      });
    }
  };

  const handleDeleteService = () => {
    if (deleteServiceId) {
      deleteServiceMutation.mutate(deleteServiceId, {
        onSuccess: () => setDeleteServiceId(null),
      });
    }
  };

  const handleDeleteMilestone = () => {
    if (deleteMilestoneId) {
      deleteMilestoneMutation.mutate(deleteMilestoneId, {
        onSuccess: () => setDeleteMilestoneId(null),
      });
    }
  };

  const getTriggerLabel = (triggerType: string) => {
    const found = TRIGGER_TYPES.find((t) => t.value === triggerType);
    return found?.label || triggerType;
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
                ניהול תבניות
              </h1>
            </div>
          </div>
        </div>

        {/* Content Tabs: Fee Items, Services, Milestones */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fee-items" className="gap-2">
              <FileText className="h-4 w-4" />
              שורות שכ"ט
              {feeItems && feeItems.length > 0 && (
                <Badge variant="secondary" className="mr-1">{feeItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Briefcase className="h-4 w-4" />
              שירותים
              {services && services.length > 0 && (
                <Badge variant="secondary" className="mr-1">{services.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Milestone className="h-4 w-4" />
              אבני דרך
              {milestones && milestones.length > 0 && (
                <Badge variant="secondary" className="mr-1">{milestones.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Fee Items Tab */}
          <TabsContent value="fee-items">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">שורות שכר טרחה</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setCreateFeeItemDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  הוסף שורה
                </Button>
              </CardHeader>
              <CardContent>
                {feeItemsLoading ? (
                  <Skeleton className="h-32" />
                ) : feeItems && feeItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">תיאור</TableHead>
                        <TableHead className="text-right">יחידה</TableHead>
                        <TableHead className="text-right">כמות ברירת מחדל</TableHead>
                        <TableHead className="text-right">סוג חיוב</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeItems.map((item) => (
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingFeeItem(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => setDeleteFeeItemId(item.id)}
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
                    <p>אין שורות שכר טרחה. הוסף שורה ראשונה כדי להתחיל.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">שירותים</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setCreateServiceDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  הוסף שירות
                </Button>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <Skeleton className="h-32" />
                ) : services && services.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">שם השירות</TableHead>
                        <TableHead className="text-right">קטגוריית שכ"ט</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">{service.task_name}</TableCell>
                          <TableCell>{service.default_fee_category || "-"}</TableCell>
                          <TableCell>
                            {service.is_optional ? (
                              <Badge variant="secondary">אופציונלי</Badge>
                            ) : (
                              <Badge variant="default">חובה</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingService(service)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => setDeleteServiceId(service.id)}
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
                    <p>אין שירותים. הוסף שירות ראשון כדי להתחיל.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">אבני דרך</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setCreateMilestoneDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  הוסף אבן דרך
                </Button>
              </CardHeader>
              <CardContent>
                {milestonesLoading ? (
                  <Skeleton className="h-32" />
                ) : milestones && milestones.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">שם</TableHead>
                        <TableHead className="text-right">אחוז מהסכום</TableHead>
                        <TableHead className="text-right">טריגר</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {milestones.map((milestone) => (
                        <TableRow key={milestone.id}>
                          <TableCell className="font-medium">{milestone.name}</TableCell>
                          <TableCell>{milestone.percentage_of_total}%</TableCell>
                          <TableCell>{getTriggerLabel(milestone.trigger_type)}</TableCell>
                          <TableCell>
                            {milestone.is_active ? (
                              <Badge variant="default">פעיל</Badge>
                            ) : (
                              <Badge variant="secondary">לא פעיל</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingMilestone(milestone)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => setDeleteMilestoneId(milestone.id)}
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
                    <p>אין אבני דרך. הוסף אבן דרך ראשונה כדי להתחיל.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Fee Item Dialogs */}
      <CreateFeeItemTemplateDialog
        open={createFeeItemDialogOpen}
        onOpenChange={setCreateFeeItemDialogOpen}
        defaultAdvisorSpecialty={decodedAdvisorType}
        defaultProjectType={decodedProjectType}
      />
      <EditFeeItemTemplateDialog
        open={!!editingFeeItem}
        onOpenChange={(open) => !open && setEditingFeeItem(null)}
        template={editingFeeItem}
      />

      {/* Service Dialogs */}
      <CreateServiceScopeTemplateDialog
        open={createServiceDialogOpen}
        onOpenChange={setCreateServiceDialogOpen}
        defaultAdvisorSpecialty={decodedAdvisorType}
        defaultProjectType={decodedProjectType}
      />
      <EditServiceScopeTemplateDialog
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
        template={editingService}
      />

      {/* Milestone Dialogs */}
      <CreateMilestoneTemplateDialog
        open={createMilestoneDialogOpen}
        onOpenChange={setCreateMilestoneDialogOpen}
        defaultAdvisorSpecialty={decodedAdvisorType}
        defaultProjectType={decodedProjectType}
      />
      <EditMilestoneTemplateDialog
        open={!!editingMilestone}
        onOpenChange={(open) => !open && setEditingMilestone(null)}
        template={editingMilestone}
      />

      {/* Delete Fee Item Confirmation */}
      <AlertDialog open={!!deleteFeeItemId} onOpenChange={() => setDeleteFeeItemId(null)}>
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
              onClick={handleDeleteFeeItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Service Confirmation */}
      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שירות</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את השירות?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Milestone Confirmation */}
      <AlertDialog open={!!deleteMilestoneId} onOpenChange={() => setDeleteMilestoneId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת אבן דרך</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את אבן הדרך?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMilestone}
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
