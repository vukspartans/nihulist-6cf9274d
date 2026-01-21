import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Pencil, Trash2, AlertTriangle } from "lucide-react";
import {
  useMunicipalities,
  useUpdateMunicipality,
  useDeleteMunicipality,
  type Municipality,
} from "@/hooks/useMunicipalities";
import { CreateMunicipalityDialog } from "@/components/admin/CreateMunicipalityDialog";
import { EditMunicipalityDialog } from "@/components/admin/EditMunicipalityDialog";
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
import { adminTranslations } from "@/constants/adminTranslations";

const MunicipalitiesManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<Municipality | null>(null);

  const { data: municipalities, isLoading } = useMunicipalities(true);
  const updateMunicipality = useUpdateMunicipality();
  const deleteMunicipality = useDeleteMunicipality();

  const t = adminTranslations.licensing?.municipalities || {
    title: "ניהול עיריות",
    searchPlaceholder: "חפש עירייה...",
    createButton: "הוסף עירייה",
    columns: {
      name: "שם העירייה",
      region: "אזור",
      specialRequirements: "דרישות מיוחדות",
      status: "סטטוס",
      actions: "פעולות",
    },
    general: "כללי",
    deleteConfirm: "האם אתה בטוח שברצונך למחוק עירייה זו?",
    deleteWarning: "פעולה זו תמחק את העירייה וכל התבניות המקושרות אליה.",
  };

  const filteredMunicipalities = municipalities?.filter((municipality) =>
    municipality.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    municipality.region?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleToggleActive = async (municipality: Municipality) => {
    await updateMunicipality.mutateAsync({
      id: municipality.id,
      is_active: !municipality.is_active,
    });
  };

  const handleEdit = (municipality: Municipality) => {
    setSelectedMunicipality(municipality);
    setEditDialogOpen(true);
  };

  const handleDelete = (municipality: Municipality) => {
    setSelectedMunicipality(municipality);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedMunicipality) {
      await deleteMunicipality.mutateAsync(selectedMunicipality.id);
      setDeleteDialogOpen(false);
      setSelectedMunicipality(null);
    }
  };

  const columns = [
    {
      header: t.columns.name,
      accessorKey: "name" as keyof Municipality,
    },
    {
      header: t.columns.region,
      accessorKey: "region" as keyof Municipality,
      cell: (municipality: Municipality) => municipality.region || "-",
    },
    {
      header: t.columns.specialRequirements,
      accessorKey: "has_special_requirements" as keyof Municipality,
      cell: (municipality: Municipality) =>
        municipality.has_special_requirements ? (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            יש דרישות
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: t.columns.status,
      accessorKey: "is_active" as keyof Municipality,
      cell: (municipality: Municipality) => (
        <Switch
          checked={municipality.is_active}
          onCheckedChange={() => handleToggleActive(municipality)}
          disabled={updateMunicipality.isPending}
        />
      ),
    },
    {
      header: t.columns.actions,
      accessorKey: "id" as keyof Municipality,
      cell: (municipality: Municipality) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(municipality);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(municipality);
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
              ניהול רשימת העיריות והגדרות מיוחדות
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.createButton}
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            data={filteredMunicipalities}
            columns={columns}
            pageSize={10}
          />
        )}

        <CreateMunicipalityDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        <EditMunicipalityDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          municipality={selectedMunicipality}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת עירייה</AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteConfirm}
                <br />
                <span className="text-destructive font-medium">{t.deleteWarning}</span>
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

export default MunicipalitiesManagement;
