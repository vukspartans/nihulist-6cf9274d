import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2, Pencil, FileText, Briefcase, Milestone, Star, Copy } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFeeItemTemplatesByCategory,
  useServiceScopeTemplatesByCategory,
  useDeleteFeeItemTemplate,
  useDeleteServiceScopeTemplate,
  useReorderFeeItemTemplates,
  useReorderServiceScopeTemplates,
  FeeItemTemplate,
  ServiceScopeTemplate,
} from "@/hooks/useRFPTemplatesAdmin";
import {
  useMilestoneTemplatesByCategory,
  useDeleteMilestoneTemplate,
  useReorderMilestoneTemplates,
} from "@/hooks/useMilestoneTemplates";
import {
  useFeeTemplateCategories,
  useFeeSubmissionMethods,
  useCreateSubmissionMethod,
  useUpdateSubmissionMethod,
  useDeleteSubmissionMethod,
} from "@/hooks/useFeeTemplateHierarchy";
import { SortableDataTable, Column } from "@/components/admin/SortableDataTable";
import { MilestonePercentageSummary } from "@/components/admin/MilestonePercentageSummary";
import { getFeeUnitLabel, getChargeTypeLabel } from "@/constants/rfpUnits";
import { CreateFeeItemTemplateDialog } from "@/components/admin/CreateFeeItemTemplateDialog";
import { EditFeeItemTemplateDialog } from "@/components/admin/EditFeeItemTemplateDialog";
import { CreateServiceScopeTemplateDialog } from "@/components/admin/CreateServiceScopeTemplateDialog";
import { EditServiceScopeTemplateDialog } from "@/components/admin/EditServiceScopeTemplateDialog";
import { CreateMilestoneTemplateDialog } from "@/components/admin/CreateMilestoneTemplateDialog";
import { EditMilestoneTemplateDialog } from "@/components/admin/EditMilestoneTemplateDialog";
import { CreateSubmissionMethodDialog } from "@/components/admin/CreateSubmissionMethodDialog";
import { TRIGGER_TYPES, type MilestoneTemplate } from "@/types/milestoneTemplate";
import { METHOD_TYPE_LABELS } from "@/types/feeTemplateHierarchy";
import { getIndexLabel } from "@/constants/indexTypes";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function FeeTemplatesByCategory() {
  const { advisorType, projectType, categoryId } = useParams<{
    advisorType: string;
    projectType: string;
    categoryId: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const decodedAdvisorType = decodeURIComponent(advisorType || "");
  const decodedProjectType = decodeURIComponent(projectType || "");

  const [activeTab, setActiveTab] = useState<string>("services");
  const [activeMethodId, setActiveMethodId] = useState<string | null>(null);

  // Fee Items state
  const [createFeeItemDialogOpen, setCreateFeeItemDialogOpen] = useState(false);
  const [editingFeeItem, setEditingFeeItem] = useState<FeeItemTemplate | null>(null);
  const [deleteFeeItemId, setDeleteFeeItemId] = useState<string | null>(null);

  // Services state
  const [createServiceDialogOpen, setCreateServiceDialogOpen] = useState(false);
  const [createServiceHeader, setCreateServiceHeader] = useState<string | undefined>(undefined);
  const [editingService, setEditingService] = useState<ServiceScopeTemplate | null>(null);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [createHeaderDialogOpen, setCreateHeaderDialogOpen] = useState(false);
  const [newHeaderName, setNewHeaderName] = useState("");
  const [editingHeaderName, setEditingHeaderName] = useState<string | null>(null);
  const [editedHeaderName, setEditedHeaderName] = useState("");
  const [deleteHeaderName, setDeleteHeaderName] = useState<string | null>(null);

  // Milestones state
  const [createMilestoneDialogOpen, setCreateMilestoneDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneTemplate | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);

  // Submission method state
  const [createMethodDialogOpen, setCreateMethodDialogOpen] = useState(false);
  const [copyingFromMethodId, setCopyingFromMethodId] = useState<string | null>(null);

  // Get category info
  const { data: categories } = useFeeTemplateCategories(decodedAdvisorType, decodedProjectType);
  const category = categories?.find((c) => c.id === categoryId);

  // Submission methods for this category
  const { data: methods, isLoading: methodsLoading } = useFeeSubmissionMethods(categoryId);
  const createMethodMutation = useCreateSubmissionMethod();
  const updateMethodMutation = useUpdateSubmissionMethod();
  const deleteMethodMutation = useDeleteSubmissionMethod();

  // Set active method to default or first method when loaded
  const effectiveMethodId = activeMethodId || methods?.find((m) => m.is_default)?.id || methods?.[0]?.id || null;

  // Fetch data scoped to category
  const { data: feeItems, isLoading: feeItemsLoading } = useFeeItemTemplatesByCategory(categoryId || "", effectiveMethodId);
  const { data: services, isLoading: servicesLoading } = useServiceScopeTemplatesByCategory(categoryId || "");
  const { data: milestones, isLoading: milestonesLoading } = useMilestoneTemplatesByCategory(categoryId || "");

  // Delete mutations
  const deleteFeeItemMutation = useDeleteFeeItemTemplate();
  const deleteServiceMutation = useDeleteServiceScopeTemplate();
  const deleteMilestoneMutation = useDeleteMilestoneTemplate();

  // Reorder mutations
  const reorderFeeItemsMutation = useReorderFeeItemTemplates();
  const reorderServicesMutation = useReorderServiceScopeTemplates();
  const reorderMilestonesMutation = useReorderMilestoneTemplates();

  const handleBack = () => {
    navigate(
      `/heyadmin/fee-templates/${encodeURIComponent(decodedAdvisorType)}/${encodeURIComponent(decodedProjectType)}`
    );
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

  const handleSetDefaultMethod = (methodId: string) => {
    if (!categoryId) return;
    updateMethodMutation.mutate({
      id: methodId,
      is_default: true,
      category_id: categoryId,
    });
  };

  const handleCopyFeeItems = async (fromMethodId: string, toMethodId: string) => {
    try {
      // Fetch items from source method
      const { data: sourceItems, error: fetchError } = await supabase
        .from("default_fee_item_templates")
        .select("*")
        .eq("category_id", categoryId!)
        .eq("submission_method_id", fromMethodId)
        .order("display_order", { ascending: true });

      if (fetchError) throw fetchError;
      if (!sourceItems || sourceItems.length === 0) {
        toast({ title: "אין שורות להעתקה בשיטה זו", variant: "destructive" });
        return;
      }

      // Insert copies for target method
      const copies = sourceItems.map(({ id, created_at, updated_at, ...item }) => ({
        ...item,
        submission_method_id: toMethodId,
      }));

      const { error: insertError } = await supabase
        .from("default_fee_item_templates")
        .insert(copies);

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["rfp-templates"] });
      toast({ title: `הועתקו ${sourceItems.length} שורות בהצלחה` });
      setCopyingFromMethodId(null);
    } catch (error: any) {
      toast({ title: "שגיאה בהעתקה", description: error.message, variant: "destructive" });
    }
  };

  const getTriggerLabel = (triggerType: string) => {
    const found = TRIGGER_TYPES.find((t) => t.value === triggerType);
    return found?.label || triggerType;
  };

  // Column definitions
  const feeItemColumns: Column<FeeItemTemplate & { display_order: number }>[] = [
    {
      header: "",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingFeeItem(item); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteFeeItemId(item.id); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    { header: "תיאור", accessorKey: "description" },
    { header: "יחידה", cell: (item) => getFeeUnitLabel(item.unit) },
    { header: "כמות ברירת מחדל", cell: (item) => item.default_quantity || "-" },
    { header: "סוג חיוב", cell: (item) => getChargeTypeLabel(item.charge_type || 'one_time') },
    {
      header: "סטטוס",
      cell: (item) => item.is_optional ? <Badge variant="secondary">אופציונלי</Badge> : <Badge variant="default">חובה</Badge>,
    },
  ];

  // Group services by default_fee_category for two-level view
  const groupedServices = useMemo(() => {
    if (!services) return {};
    const groups: Record<string, ServiceScopeTemplate[]> = {};
    for (const svc of services) {
      const key = svc.default_fee_category || "כללי";
      if (!groups[key]) groups[key] = [];
      groups[key].push(svc);
    }
    return groups;
  }, [services]);

  const headerNames = useMemo(() => Object.keys(groupedServices), [groupedServices]);

  const handleCreateHeader = () => {
    if (!newHeaderName.trim() || !decodedAdvisorType) return;
    // Create a placeholder service under this header
    setNewHeaderName("");
    setCreateHeaderDialogOpen(false);
    // Open the service creation dialog with the new header pre-filled
    setCreateServiceHeader(newHeaderName.trim());
    setCreateServiceDialogOpen(true);
  };

  const handleRenameHeader = async () => {
    if (!editingHeaderName || !editedHeaderName.trim() || !services) return;
    // Update all services under the old header name to use the new name
    const affectedServices = services.filter(s => (s.default_fee_category || "כללי") === editingHeaderName);
    for (const svc of affectedServices) {
      await supabase
        .from("default_service_scope_templates")
        .update({ default_fee_category: editedHeaderName.trim() })
        .eq("id", svc.id);
    }
    queryClient.invalidateQueries({ queryKey: ["service-scope-templates-admin"], exact: false });
    toast({ title: "כותרת עודכנה בהצלחה" });
    setEditingHeaderName(null);
    setEditedHeaderName("");
  };

  const handleDeleteHeader = () => {
    if (!deleteHeaderName || !services) return;
    // Delete all services under this header
    const affectedServices = services.filter(s => (s.default_fee_category || "כללי") === deleteHeaderName);
    for (const svc of affectedServices) {
      deleteServiceMutation.mutate(svc.id);
    }
    setDeleteHeaderName(null);
  };

  const milestoneColumns: Column<MilestoneTemplate & { display_order: number }>[] = [
    {
      header: "",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingMilestone(item); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteMilestoneId(item.id); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    { header: "שם", accessorKey: "name" },
    { header: "אחוז מהסכום", cell: (item) => `${item.percentage_of_total}%` },
    { header: "טריגר", cell: (item) => getTriggerLabel(item.trigger_type) },
    {
      header: "סטטוס",
      cell: (item) => item.is_active ? <Badge variant="default">פעיל</Badge> : <Badge variant="secondary">לא פעיל</Badge>,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Breadcrumb & Header */}
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
            <ChevronRight className="h-4 w-4" />
            חזרה לסוגי תבניות
          </Button>

          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>{decodedAdvisorType}</span>
              <ChevronLeft className="h-3 w-3" />
              <span>{decodedProjectType}</span>
              <ChevronLeft className="h-3 w-3" />
              <span className="font-medium text-foreground">{category?.name || "..."}</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              ניהול תבנית: {category?.name || "..."}
            </h1>
            {category && (
              <p className="text-sm text-muted-foreground mt-1">
                מדד: {getIndexLabel(category.default_index_type)}
              </p>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-3" dir="rtl">
            <TabsTrigger value="services" className="gap-2">
              <Briefcase className="h-4 w-4" />
              שירותים
              {services && services.length > 0 && (
                <Badge variant="secondary" className="mr-1">{services.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fee-items" className="gap-2">
              <FileText className="h-4 w-4" />
              שורות שכ"ט
              {feeItems && feeItems.length > 0 && (
                <Badge variant="secondary" className="mr-1">{feeItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="milestones" className="gap-2">
              <Milestone className="h-4 w-4" />
              תשלום
              {milestones && milestones.length > 0 && (
                <Badge variant="secondary" className="mr-1">{milestones.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Fee Items Tab - with Submission Method Sub-Tabs */}
          <TabsContent value="fee-items">
            <div className="space-y-4">
              {/* Submission Methods Table */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">שיטת ההגשה</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">ברירת מחדל</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCreateMethodDialogOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      הוסף
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {methodsLoading ? (
                    <Skeleton className="h-20" />
                  ) : methods && methods.length > 0 ? (
                    <RadioGroup
                      dir="rtl"
                      value={methods.find((m) => m.is_default)?.id || ""}
                      onValueChange={(val) => handleSetDefaultMethod(val)}
                    >
                      <Table>
                        <TableBody>
                          {methods.map((method) => (
                            <TableRow
                              key={method.id}
                              className={cn(
                                "cursor-pointer",
                                effectiveMethodId === method.id && "bg-muted/50"
                              )}
                              onClick={() => setActiveMethodId(method.id)}
                            >
                              <TableCell className="w-[100px]">
                                <div className="flex items-center gap-1">
                                  {methods.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      title="העתק שורות"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCopyingFromMethodId(method.id);
                                      }}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    title="מחק שיטה"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteMethodMutation.mutate(method.id);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {method.method_label}
                                {effectiveMethodId === method.id && (
                                  <Badge variant="secondary" className="mr-2 text-xs">נבחר</Badge>
                                )}
                              </TableCell>
                              <TableCell className="w-[80px] text-center" onClick={(e) => e.stopPropagation()}>
                                <RadioGroupItem value={method.id} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </RadioGroup>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="mb-3">הוסף שיטת הגשה ראשונה (פאושלי, כמותי, שעתי) כדי להתחיל.</p>
                      <Button
                        variant="outline"
                        onClick={() => setCreateMethodDialogOpen(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        הוסף שיטת הגשה
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Copy target picker */}
              {copyingFromMethodId && methods && (
                <Card className="border-dashed border-primary">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">העתק שורות מ-{methods.find(m => m.id === copyingFromMethodId)?.method_label} אל:</span>
                      {methods
                        .filter((m) => m.id !== copyingFromMethodId)
                        .map((m) => (
                          <Button
                            key={m.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyFeeItems(copyingFromMethodId, m.id)}
                          >
                            {m.method_label}
                          </Button>
                        ))}
                      <Button variant="ghost" size="sm" onClick={() => setCopyingFromMethodId(null)}>
                        ביטול
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fee Items Table */}
              {effectiveMethodId && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">
                      שורות שכ"ט — {methods?.find(m => m.id === effectiveMethodId)?.method_label}
                    </CardTitle>
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
                      <SortableDataTable
                        data={feeItems}
                        columns={feeItemColumns}
                        onReorder={(orderedIds) => reorderFeeItemsMutation.mutate(orderedIds)}
                        isReordering={reorderFeeItemsMutation.isPending}
                      />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>אין שורות שכר טרחה בשיטה זו. הוסף שורה ראשונה כדי להתחיל.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <div className="space-y-4">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">שירותים</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateHeaderDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  הוסף כותרת
                </Button>
              </div>

              {servicesLoading ? (
                <Skeleton className="h-32" />
              ) : headerNames.length > 0 ? (
                <div className="space-y-3">
                  {headerNames.map((headerName) => {
                    const items = groupedServices[headerName] || [];
                    const requiredCount = items.filter(i => !i.is_optional).length;
                    return (
                      <Collapsible key={headerName} defaultOpen>
                        <Card>
                          <CollapsibleTrigger asChild>
                            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-2">
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=closed]_&]:-rotate-90" />
                                <span className="font-semibold">{headerName}</span>
                                {requiredCount > 0 && (
                                  <Badge variant="default" className="text-xs">{requiredCount} חובה</Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">{items.length} שירותים</Badge>
                              </div>
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="ערוך כותרת"
                                  onClick={() => {
                                    setEditingHeaderName(headerName);
                                    setEditedHeaderName(headerName);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  title="מחק כותרת"
                                  onClick={() => setDeleteHeaderName(headerName)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 mr-2"
                                  onClick={() => {
                                    setCreateServiceHeader(headerName);
                                    setCreateServiceDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  הוסף שירות
                                </Button>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-2 px-4">
                              {items.length > 0 ? (
                                <div className="divide-y divide-border">
                                  {items.map((svc) => (
                                    <div key={svc.id} className="flex items-center justify-between py-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{svc.task_name}</span>
                                        {svc.is_optional ? (
                                          <Badge variant="secondary" className="text-xs">אופציונלי</Badge>
                                        ) : (
                                          <Badge variant="default" className="text-xs">חובה</Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingService(svc)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteServiceId(svc.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground py-2">אין שירותים בכותרת זו</p>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    <p className="mb-3">אין שירותים. הוסף כותרת ראשונה כדי להתחיל.</p>
                    <Button variant="outline" onClick={() => setCreateHeaderDialogOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      הוסף כותרת
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">אבני דרך</CardTitle>
                <Button size="sm" onClick={() => setCreateMilestoneDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  הוסף אבן דרך
                </Button>
              </CardHeader>
              <CardContent>
                {milestonesLoading ? (
                  <Skeleton className="h-32" />
                ) : milestones && milestones.length > 0 ? (
                  <>
                  <MilestonePercentageSummary milestones={milestones} />
                  <SortableDataTable
                    data={milestones}
                    columns={milestoneColumns}
                    onReorder={(orderedIds) => reorderMilestonesMutation.mutate(orderedIds)}
                    isReordering={reorderMilestonesMutation.isPending}
                   />
                  </>
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

      {/* Submission Method Dialog */}
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

      {/* Fee Item Dialogs */}
      <CreateFeeItemTemplateDialog
        open={createFeeItemDialogOpen}
        onOpenChange={setCreateFeeItemDialogOpen}
        defaultAdvisorSpecialty={decodedAdvisorType}
        defaultProjectType={decodedProjectType}
        defaultCategoryId={categoryId}
        defaultSubmissionMethodId={effectiveMethodId || undefined}
      />
      <EditFeeItemTemplateDialog
        open={!!editingFeeItem}
        onOpenChange={(open) => !open && setEditingFeeItem(null)}
        template={editingFeeItem}
      />

      {/* Service Dialogs */}
      <CreateServiceScopeTemplateDialog
        open={createServiceDialogOpen}
        onOpenChange={(open) => {
          setCreateServiceDialogOpen(open);
          if (!open) setCreateServiceHeader(undefined);
        }}
        defaultAdvisorSpecialty={decodedAdvisorType}
        defaultProjectType={decodedProjectType}
        defaultCategoryId={categoryId}
        defaultHeader={createServiceHeader}
      />
      <EditServiceScopeTemplateDialog
        open={!!editingService}
        onOpenChange={(open) => !open && setEditingService(null)}
        template={editingService}
        availableHeaders={headerNames}
      />

      {/* Create Header Dialog */}
      <Dialog open={createHeaderDialogOpen} onOpenChange={setCreateHeaderDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת כותרת חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>כותרת *</Label>
            <Input
              value={newHeaderName}
              onChange={(e) => setNewHeaderName(e.target.value)}
              placeholder="לדוגמה: היקף העבודה"
              className="text-right"
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setCreateHeaderDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleCreateHeader} disabled={!newHeaderName.trim()}>
              צור כותרת
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Header Dialog */}
      <Dialog open={!!editingHeaderName} onOpenChange={(open) => !open && setEditingHeaderName(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת כותרת</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>שם הכותרת *</Label>
            <Input
              value={editedHeaderName}
              onChange={(e) => setEditedHeaderName(e.target.value)}
              className="text-right"
            />
          </div>
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setEditingHeaderName(null)}>ביטול</Button>
            <Button onClick={handleRenameHeader} disabled={!editedHeaderName.trim()}>
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Header Confirmation */}
      <AlertDialog open={!!deleteHeaderName} onOpenChange={() => setDeleteHeaderName(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת כותרת "{deleteHeaderName}"</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את כל השירותים ({groupedServices[deleteHeaderName || ""]?.length || 0}) תחת כותרת זו. האם להמשיך?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHeader} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Milestone Dialogs */}
      <CreateMilestoneTemplateDialog
        open={createMilestoneDialogOpen}
        onOpenChange={setCreateMilestoneDialogOpen}
        defaultAdvisorSpecialty={decodedAdvisorType}
        defaultProjectType={decodedProjectType}
        defaultCategoryId={categoryId}
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
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את השורה?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFeeItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Service Confirmation */}
      <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת שירות</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את השירות?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteService} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Milestone Confirmation */}
      <AlertDialog open={!!deleteMilestoneId} onOpenChange={() => setDeleteMilestoneId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת אבן דרך</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את אבן הדרך?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMilestone} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
