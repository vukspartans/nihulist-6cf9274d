import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Clock } from "lucide-react";
import {
  useLicensingPhases,
  useUpdateLicensingPhase,
  useDeleteLicensingPhase,
  type LicensingPhase,
} from "@/hooks/useLicensingPhases";
import { useMunicipalities } from "@/hooks/useMunicipalities";
import { CreateLicensingPhaseDialog } from "@/components/admin/CreateLicensingPhaseDialog";
import { EditLicensingPhaseDialog } from "@/components/admin/EditLicensingPhaseDialog";
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

const LicensingPhasesManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = useState<string>("all");
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<LicensingPhase | null>(null);

  const { data: phases, isLoading } = useLicensingPhases({ includeInactive: true });
  const { data: municipalities } = useMunicipalities(false);
  const updatePhase = useUpdateLicensingPhase();
  const deletePhase = useDeleteLicensingPhase();

  const t = adminTranslations.licensing?.phases || {
    title: "שלבי רישוי",
    searchPlaceholder: "חפש שלב...",
    createButton: "הוסף שלב",
    columns: {
      name: "שם השלב",
      description: "תיאור",
      municipality: "עירייה",
      projectType: "סוג פרויקט",
      defaultDuration: "משך ברירת מחדל",
      displayOrder: "סדר",
      status: "סטטוס",
      actions: "פעולות",
    },
    general: "כללי",
    allMunicipalities: "כל העיריות",
    allProjectTypes: "כל סוגי הפרויקטים",
    days: "ימים",
    deleteConfirm: "האם אתה בטוח שברצונך למחוק שלב זה?",
  };

  const filteredPhases = phases?.filter((phase) => {
    const matchesSearch =
      phase.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phase.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMunicipality =
      municipalityFilter === "all" ||
      (municipalityFilter === "general" && !phase.municipality_id) ||
      phase.municipality_id === municipalityFilter;

    const matchesProjectType =
      projectTypeFilter === "all" ||
      (projectTypeFilter === "general" && !phase.project_type) ||
      phase.project_type === projectTypeFilter;

    return matchesSearch && matchesMunicipality && matchesProjectType;
  }) || [];

  const handleToggleActive = async (phase: LicensingPhase) => {
    await updatePhase.mutateAsync({
      id: phase.id,
      is_active: !phase.is_active,
    });
  };

  const handleEdit = (phase: LicensingPhase) => {
    setSelectedPhase(phase);
    setEditDialogOpen(true);
  };

  const handleDelete = (phase: LicensingPhase) => {
    setSelectedPhase(phase);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedPhase) {
      await deletePhase.mutateAsync(selectedPhase.id);
      setDeleteDialogOpen(false);
      setSelectedPhase(null);
    }
  };

  const columns = [
    {
      header: t.columns.displayOrder,
      accessorKey: "display_order" as keyof LicensingPhase,
      cell: (phase: LicensingPhase) => (
        <Badge variant="outline" className="font-mono">
          {phase.display_order}
        </Badge>
      ),
    },
    {
      header: t.columns.name,
      accessorKey: "name" as keyof LicensingPhase,
    },
    {
      header: t.columns.municipality,
      accessorKey: "municipality_id" as keyof LicensingPhase,
      cell: (phase: LicensingPhase) =>
        phase.municipalities?.name || (
          <span className="text-muted-foreground">{t.general}</span>
        ),
    },
    {
      header: t.columns.projectType,
      accessorKey: "project_type" as keyof LicensingPhase,
      cell: (phase: LicensingPhase) => {
        const projectType = PROJECT_TYPE_OPTIONS.find(
          (p) => p.value === phase.project_type
        );
        return projectType?.label || (
          <span className="text-muted-foreground">{t.general}</span>
        );
      },
    },
    {
      header: t.columns.defaultDuration,
      accessorKey: "default_duration_days" as keyof LicensingPhase,
      cell: (phase: LicensingPhase) =>
        phase.default_duration_days ? (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{phase.default_duration_days} {t.days}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: t.columns.status,
      accessorKey: "is_active" as keyof LicensingPhase,
      cell: (phase: LicensingPhase) => (
        <Switch
          checked={phase.is_active}
          onCheckedChange={() => handleToggleActive(phase)}
          disabled={updatePhase.isPending}
        />
      ),
    },
    {
      header: t.columns.actions,
      accessorKey: "id" as keyof LicensingPhase,
      cell: (phase: LicensingPhase) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(phase);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(phase);
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="text-muted-foreground mt-1">
              הגדרת שלבי רישוי לפי סוג פרויקט ועירייה
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.createButton}
          </Button>
        </div>

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

          <Select value={municipalityFilter} onValueChange={setMunicipalityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.allMunicipalities} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allMunicipalities}</SelectItem>
              <SelectItem value="general">{t.general}</SelectItem>
              {municipalities?.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.allProjectTypes} />
            </SelectTrigger>
            <SelectContent>
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
            data={filteredPhases}
            columns={columns}
            pageSize={10}
          />
        )}

        <CreateLicensingPhaseDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          municipalities={municipalities || []}
        />

        <EditLicensingPhaseDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          phase={selectedPhase}
          municipalities={municipalities || []}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת שלב רישוי</AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteConfirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default LicensingPhasesManagement;
