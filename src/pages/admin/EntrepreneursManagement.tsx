import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminTranslations as t } from "@/constants/adminTranslations";
import AdminLayout from "@/components/admin/AdminLayout";
import { SearchBar } from "@/components/admin/SearchBar";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { logAdminAction } from "@/lib/auditLog";
import { CreateEntrepreneurDialog } from "@/components/admin/CreateEntrepreneurDialog";
import { EditEntrepreneurDialog } from "@/components/admin/EditEntrepreneurDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Entrepreneur {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  created_at: string;
}

export default function EntrepreneursManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntrepreneur, setSelectedEntrepreneur] = useState<Entrepreneur | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch entrepreneurs
  const { data: entrepreneurs = [], isLoading } = useQuery({
    queryKey: ["entrepreneurs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "entrepreneur")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Entrepreneur[];
    },
  });

  // Filter entrepreneurs by search
  const filteredEntrepreneurs = entrepreneurs.filter((entrepreneur) => {
    const search = searchQuery.toLowerCase();
    return (
      entrepreneur.name?.toLowerCase().includes(search) ||
      entrepreneur.email?.toLowerCase().includes(search) ||
      entrepreneur.company_name?.toLowerCase().includes(search)
    );
  });

  // Delete entrepreneur mutation - uses edge function for proper auth admin access
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'delete',
          userId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: async (_, userId) => {
      await logAdminAction("delete", "profiles", userId);
      queryClient.invalidateQueries({ queryKey: ["entrepreneurs"] });
      toast({
        title: t.entrepreneurs.messages.deleted,
      });
      setDeleteDialogOpen(false);
      setSelectedEntrepreneur(null);
    },
    onError: (error) => {
      console.error("Error deleting entrepreneur:", error);
      toast({
        title: t.entrepreneurs.messages.error,
        variant: "destructive",
      });
    },
  });

  const columns: Column<Entrepreneur>[] = [
    {
      header: t.entrepreneurs.columns.name,
      cell: (entrepreneur) => (
        <span className="max-w-[120px] sm:max-w-[180px] truncate block" title={entrepreneur.name || ""}>
          {entrepreneur.name || "-"}
        </span>
      ),
    },
    {
      header: t.entrepreneurs.columns.email,
      cell: (entrepreneur) => (
        <span className="max-w-[140px] sm:max-w-[200px] truncate block" title={entrepreneur.email || ""}>
          {entrepreneur.email || "-"}
        </span>
      ),
    },
    {
      header: t.entrepreneurs.columns.phone,
      accessorKey: "phone",
    },
    {
      header: t.entrepreneurs.columns.company,
      cell: (entrepreneur) => (
        <span className="max-w-[100px] sm:max-w-[150px] truncate block" title={entrepreneur.company_name || ""}>
          {entrepreneur.company_name || "-"}
        </span>
      ),
    },
    {
      header: t.entrepreneurs.columns.createdAt,
      cell: (entrepreneur) => new Date(entrepreneur.created_at).toLocaleDateString("he-IL"),
    },
    {
      header: t.entrepreneurs.columns.actions,
      cell: (entrepreneur) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={t.entrepreneurs.editButton}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEntrepreneur(entrepreneur);
              setEditDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title={t.entrepreneurs.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEntrepreneur(entrepreneur);
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              {t.entrepreneurs.title}
            </h1>
            <p className="text-muted-foreground mt-1">ניהול יזמים במערכת</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 ml-2" />
            {t.entrepreneurs.createButton}
          </Button>
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.entrepreneurs.searchPlaceholder}
        />

        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
          <div className="p-2 sm:p-4 lg:p-6">
            <DataTable
              data={filteredEntrepreneurs}
              columns={columns}
            />
          </div>
        </div>

        <CreateEntrepreneurDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {selectedEntrepreneur && (
          <EditEntrepreneurDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            entrepreneur={selectedEntrepreneur}
          />
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader className="text-right">
              <AlertDialogTitle>{t.entrepreneurs.deleteButton}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.entrepreneurs.deleteConfirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogAction
                onClick={() => selectedEntrepreneur && deleteMutation.mutate(selectedEntrepreneur.user_id)}
              >
                {t.entrepreneurs.deleteButton}
              </AlertDialogAction>
              <AlertDialogCancel>{t.entrepreneurs.createDialog.cancelButton}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
