import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { SortableDataTable, Column } from "@/components/admin/SortableDataTable";
import { Plus, Search, Pencil, Trash2, FileStack, DollarSign, ClipboardList } from "lucide-react";
import { ADVISOR_EXPERTISE } from "@/constants/advisor";
import { getFeeUnitLabel, getChargeTypeLabel } from "@/constants/rfpUnits";
import {
  useFeeItemTemplates,
  useServiceScopeTemplates,
  useDeleteFeeItemTemplate,
  useDeleteServiceScopeTemplate,
  useReorderFeeItemTemplates,
  useReorderServiceScopeTemplates,
  FeeItemTemplate,
  ServiceScopeTemplate,
} from "@/hooks/useRFPTemplatesAdmin";
import { CreateFeeItemTemplateDialog } from "@/components/admin/CreateFeeItemTemplateDialog";
import { EditFeeItemTemplateDialog } from "@/components/admin/EditFeeItemTemplateDialog";
import { CreateServiceScopeTemplateDialog } from "@/components/admin/CreateServiceScopeTemplateDialog";
import { EditServiceScopeTemplateDialog } from "@/components/admin/EditServiceScopeTemplateDialog";

export default function RFPTemplatesManagement() {
  // Filter state
  const [selectedAdvisorType, setSelectedAdvisorType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("fee-items");

  // Dialog states
  const [createFeeItemOpen, setCreateFeeItemOpen] = useState(false);
  const [editFeeItemOpen, setEditFeeItemOpen] = useState(false);
  const [selectedFeeItem, setSelectedFeeItem] = useState<FeeItemTemplate | null>(null);

  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [editServiceOpen, setEditServiceOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceScopeTemplate | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"fee" | "service">("fee");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries
  const { data: feeItems = [], isLoading: loadingFeeItems } = useFeeItemTemplates(
    selectedAdvisorType || undefined
  );
  const { data: services = [], isLoading: loadingServices } = useServiceScopeTemplates(
    selectedAdvisorType || undefined
  );

  // Mutations
  const deleteFeeItem = useDeleteFeeItemTemplate();
  const deleteService = useDeleteServiceScopeTemplate();
  const reorderFeeItems = useReorderFeeItemTemplates();
  const reorderServices = useReorderServiceScopeTemplates();

  // Filter data by search
  const filteredFeeItems = feeItems.filter((item) =>
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredServices = services.filter((item) =>
    item.task_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    if (deleteType === "fee") {
      await deleteFeeItem.mutateAsync(deleteId);
    } else {
      await deleteService.mutateAsync(deleteId);
    }

    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  // Fee items columns
  const feeItemColumns: Column<FeeItemTemplate & { display_order: number }>[] = [
    {
      header: "תיאור",
      accessorKey: "description",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.description}</span>
          {item.is_optional && (
            <Badge variant="outline" className="text-xs">
              אופציונלי
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "סוג יועץ",
      accessorKey: "advisor_specialty",
      cell: (item) => (
        <Badge variant="secondary" className="text-xs">
          {item.advisor_specialty}
        </Badge>
      ),
    },
    {
      header: "יחידה",
      cell: (item) => getFeeUnitLabel(item.unit),
    },
    {
      header: "כמות",
      cell: (item) => item.default_quantity ?? 1,
    },
    {
      header: "סוג חיוב",
      cell: (item) => getChargeTypeLabel(item.charge_type || "one_time"),
    },
    {
      header: "פעולות",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFeeItem(item);
              setEditFeeItemOpen(true);
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
              setDeleteType("fee");
              setDeleteId(item.id);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Service scope columns
  const serviceColumns: Column<ServiceScopeTemplate & { display_order: number }>[] = [
    {
      header: "שם השירות",
      accessorKey: "task_name",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.task_name}</span>
          {item.is_optional && (
            <Badge variant="outline" className="text-xs">
              אופציונלי
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "סוג יועץ",
      accessorKey: "advisor_specialty",
      cell: (item) => (
        <Badge variant="secondary" className="text-xs">
          {item.advisor_specialty}
        </Badge>
      ),
    },
    {
      header: "קטגוריית שכ\"ט",
      cell: (item) => item.default_fee_category || "כללי",
    },
    {
      header: "פעולות",
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedService(item);
              setEditServiceOpen(true);
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
              setDeleteType("service");
              setDeleteId(item.id);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileStack className="h-6 w-6 text-primary" />
              ניהול תבניות RFP
            </h1>
            <p className="text-muted-foreground mt-1">
              ניהול תבניות שכר טרחה ורשימות שירותים ליזמים
            </p>
          </div>

          <div className="flex gap-2">
            {activeTab === "fee-items" ? (
              <Button onClick={() => setCreateFeeItemOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                צור פריט שכ"ט
              </Button>
            ) : (
              <Button onClick={() => setCreateServiceOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                צור שירות
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <Select
                  value={selectedAdvisorType}
                  onValueChange={setSelectedAdvisorType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="כל סוגי היועצים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">כל סוגי היועצים</SelectItem>
                    {ADVISOR_EXPERTISE.map((expertise) => (
                      <SelectItem key={expertise} value={expertise}>
                        {expertise}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="fee-items" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              שכר טרחה ({feeItems.length})
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              רשימת שירותים ({services.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fee-items" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>תבניות שכר טרחה</CardTitle>
                <CardDescription>
                  פריטי שכר טרחה שיופיעו כברירת מחדל ליזמים בעת יצירת RFP
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingFeeItems ? (
                  <div className="text-center py-8 text-muted-foreground">
                    טוען...
                  </div>
                ) : filteredFeeItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    אין תבניות שכר טרחה
                    {selectedAdvisorType && ` לסוג יועץ "${selectedAdvisorType}"`}
                  </div>
                ) : (
                  <SortableDataTable
                    data={filteredFeeItems}
                    columns={feeItemColumns}
                    onReorder={(orderedIds) => reorderFeeItems.mutate(orderedIds)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>רשימת שירותים</CardTitle>
                <CardDescription>
                  שירותים שיופיעו כברירת מחדל ליזמים בעת יצירת RFP
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingServices ? (
                  <div className="text-center py-8 text-muted-foreground">
                    טוען...
                  </div>
                ) : filteredServices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    אין שירותים
                    {selectedAdvisorType && ` לסוג יועץ "${selectedAdvisorType}"`}
                  </div>
                ) : (
                  <SortableDataTable
                    data={filteredServices}
                    columns={serviceColumns}
                    onReorder={(orderedIds) => reorderServices.mutate(orderedIds)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateFeeItemTemplateDialog
        open={createFeeItemOpen}
        onOpenChange={setCreateFeeItemOpen}
        defaultAdvisorSpecialty={selectedAdvisorType}
      />

      <EditFeeItemTemplateDialog
        open={editFeeItemOpen}
        onOpenChange={setEditFeeItemOpen}
        template={selectedFeeItem}
      />

      <CreateServiceScopeTemplateDialog
        open={createServiceOpen}
        onOpenChange={setCreateServiceOpen}
        defaultAdvisorSpecialty={selectedAdvisorType}
      />

      <EditServiceScopeTemplateDialog
        open={editServiceOpen}
        onOpenChange={setEditServiceOpen}
        template={selectedService}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "fee"
                ? "פעולה זו תמחק את פריט שכר הטרחה. לא ניתן לבטל פעולה זו."
                : "פעולה זו תמחק את השירות. לא ניתן לבטל פעולה זו."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
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
