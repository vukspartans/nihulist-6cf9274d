import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Copy, Eye, Star, Clock, ListTodo } from "lucide-react";
import {
  useTaskTemplatesAdmin,
  useUpdateTaskTemplate,
  useDeleteTaskTemplate,
  type TaskTemplate,
} from "@/hooks/useTaskTemplatesAdmin";
import { useMunicipalities } from "@/hooks/useMunicipalities";
import { CreateTaskTemplateDialog } from "@/components/admin/CreateTaskTemplateDialog";
import { EditTaskTemplateDialog } from "@/components/admin/EditTaskTemplateDialog";
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
import { PROJECT_TYPE_OPTIONS } from "@/constants/project";
import { adminTranslations } from "@/constants/adminTranslations";

const TaskTemplatesManagement = () => {
  const [activeTab, setActiveTab] = useState("system");
  const [searchQuery, setSearchQuery] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = useState<string>("all");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);

  const isUserTemplates = activeTab === "user";

  const { data: templates, isLoading } = useTaskTemplatesAdmin({
    includeInactive: true,
    userTemplatesOnly: isUserTemplates,
    systemTemplatesOnly: !isUserTemplates,
  });
  const { data: municipalities } = useMunicipalities(false);
  const updateTemplate = useUpdateTaskTemplate();
  const deleteTemplate = useDeleteTaskTemplate();

  const t = adminTranslations.licensing?.templates || {
    title: "תבניות משימות",
    systemTemplates: "תבניות מערכת",
    userTemplates: "תבניות משתמשים",
    searchPlaceholder: "חפש תבנית...",
    createButton: "צור תבנית חדשה",
    columns: {
      name: "שם התבנית",
      projectType: "סוג פרויקט",
      municipality: "עירייה",
      phase: "שלב",
      duration: "משך",
      specialty: "התמחות",
      isDefault: "ברירת מחדל",
      status: "סטטוס",
      actions: "פעולות",
    },
    general: "כללי",
    allMunicipalities: "כל העיריות",
    allProjectTypes: "כל סוגי הפרויקטים",
    days: "ימים",
    deleteConfirm: "האם אתה בטוח שברצונך למחוק תבנית זו?",
    adoptAsOfficial: "אמץ כתבנית רשמית",
  };

  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMunicipality =
      municipalityFilter === "all" ||
      (municipalityFilter === "general" && !template.municipality_id) ||
      template.municipality_id === municipalityFilter;

    const matchesProjectType =
      projectTypeFilter === "all" ||
      (projectTypeFilter === "general" && !template.project_type) ||
      template.project_type === projectTypeFilter;

    return matchesSearch && matchesMunicipality && matchesProjectType;
  }) || [];

  const handleToggleActive = async (template: TaskTemplate) => {
    await updateTemplate.mutateAsync({
      id: template.id,
      is_active: !template.is_active,
    });
  };

  const handleToggleDefault = async (template: TaskTemplate) => {
    await updateTemplate.mutateAsync({
      id: template.id,
      is_default: !template.is_default,
    });
  };

  const handleEdit = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setEditDialogOpen(true);
  };

  const handleDelete = (template: TaskTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedTemplate) {
      await deleteTemplate.mutateAsync(selectedTemplate.id);
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    }
  };

  const columns = [
    {
      header: t.columns.name,
      accessorKey: "name" as keyof TaskTemplate,
      cell: (template: TaskTemplate) => (
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{template.name}</div>
            {template.description && (
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {template.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: t.columns.projectType,
      accessorKey: "project_type" as keyof TaskTemplate,
      cell: (template: TaskTemplate) => {
        const projectType = PROJECT_TYPE_OPTIONS.find(
          (p) => p.value === template.project_type
        );
        return projectType ? (
          <Badge variant="secondary">{projectType.label}</Badge>
        ) : (
          <span className="text-muted-foreground">{t.general}</span>
        );
      },
    },
    {
      header: t.columns.municipality,
      accessorKey: "municipality_id" as keyof TaskTemplate,
      cell: (template: TaskTemplate) =>
        template.municipalities?.name || (
          <span className="text-muted-foreground">{t.general}</span>
        ),
    },
    {
      header: t.columns.phase,
      accessorKey: "licensing_phase_id" as keyof TaskTemplate,
      cell: (template: TaskTemplate) =>
        template.licensing_phases?.name || (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: t.columns.duration,
      accessorKey: "default_duration_days" as keyof TaskTemplate,
      cell: (template: TaskTemplate) =>
        template.default_duration_days ? (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{template.default_duration_days} {t.days}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: t.columns.isDefault,
      accessorKey: "is_default" as keyof TaskTemplate,
      cell: (template: TaskTemplate) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDefault(template);
          }}
          className={template.is_default ? "text-yellow-500" : "text-muted-foreground"}
        >
          <Star className={`h-4 w-4 ${template.is_default ? "fill-current" : ""}`} />
        </Button>
      ),
    },
    {
      header: t.columns.status,
      accessorKey: "is_active" as keyof TaskTemplate,
      cell: (template: TaskTemplate) => (
        <Switch
          checked={template.is_active}
          onCheckedChange={() => handleToggleActive(template)}
          disabled={updateTemplate.isPending}
        />
      ),
    },
    {
      header: t.columns.actions,
      accessorKey: "id" as keyof TaskTemplate,
      cell: (template: TaskTemplate) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(template);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement duplicate
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(template);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in" dir="rtl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground mt-1">
              יצירה וניהול תבניות משימות לפרויקטים
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.createButton}
          </Button>
        </div>

        <Tabs dir="rtl" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="system">{t.systemTemplates}</TabsTrigger>
            <TabsTrigger value="user">{t.userTemplates}</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>

              <Select dir="rtl" value={municipalityFilter} onValueChange={setMunicipalityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.allMunicipalities} />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">{t.allMunicipalities}</SelectItem>
                  <SelectItem value="general">{t.general}</SelectItem>
                  {municipalities?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select dir="rtl" value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.allProjectTypes} />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">{t.allProjectTypes}</SelectItem>
                  <SelectItem value="general">{t.general}</SelectItem>
                  {PROJECT_TYPE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <DataTable
                data={filteredTemplates}
                columns={columns}
                pageSize={10}
              />
            )}
          </TabsContent>
        </Tabs>

        <CreateTaskTemplateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          municipalities={municipalities || []}
        />

        <EditTaskTemplateDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          template={selectedTemplate}
          municipalities={municipalities || []}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת תבנית</AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteConfirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                מחק
              </AlertDialogAction>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default TaskTemplatesManagement;
