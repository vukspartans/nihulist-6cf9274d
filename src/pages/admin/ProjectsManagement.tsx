import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { SearchBar } from "@/components/admin/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/auditLog";
import { adminTranslations } from "@/constants/adminTranslations";

interface Project {
  id: string;
  name: string;
  type: string | null;
  location: string | null;
  budget: number | null;
  status: string;
  phase: string | null;
  archived: boolean;
  created_at: string;
  owner_id: string;
}

const ProjectsManagement = () => {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-projects', search, showArchived],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!showArchived) {
        query = query.eq('archived', false);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const oldData = projects.find(p => p.id === id);
      const { error } = await supabase
        .from('projects')
        .update({ archived })
        .eq('id', id);
      
      if (error) throw error;
      await logAdminAction(
        archived ? 'archive' : 'restore',
        'projects',
        id,
        oldData,
        { archived }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      toast.success(
        variables.archived
          ? adminTranslations.projects.archived
          : adminTranslations.projects.restored
      );
    },
    onError: (error: any) => {
      toast.error(error.message || adminTranslations.projects.operationFailed);
    },
  });

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
      case 'ended':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return adminTranslations.projects.draft;
      case 'active': return adminTranslations.projects.active;
      case 'completed': return adminTranslations.projects.completed;
      case 'ended': return adminTranslations.projects.ended;
      case 'cancelled': return adminTranslations.projects.cancelled;
      default: return status;
    }
  };

  const columns: Column<Project>[] = [
    { 
      header: adminTranslations.projects.name, 
      cell: (item) => (
        <span className="max-w-[120px] sm:max-w-[200px] truncate block" title={item.name}>
          {item.name}
        </span>
      ),
    },
    { 
      header: adminTranslations.projects.type, 
      cell: (item) => (
        <span className="hidden md:block">{item.type || "-"}</span>
      ),
    },
    { 
      header: adminTranslations.projects.location, 
      cell: (item) => (
        <span className="max-w-[100px] sm:max-w-[150px] truncate block" title={item.location || ""}>
          {item.location || "-"}
        </span>
      ),
    },
    {
      header: adminTranslations.projects.budget,
      cell: (item) => item.budget ? `₪${item.budget.toLocaleString('he-IL')}` : adminTranslations.common.na,
    },
    {
      header: adminTranslations.projects.status,
      cell: (item) => (
        <Badge variant={statusBadgeVariant(item.status)}>
          {getStatusText(item.status)}
        </Badge>
      ),
    },
    { 
      header: adminTranslations.projects.phase, 
      cell: (item) => (
        <span className="hidden lg:block">{item.phase || "-"}</span>
      ),
    },
    {
      header: adminTranslations.projects.actions,
      cell: (item) => (
        <Button
          size="icon"
          variant={item.archived ? "ghost" : "ghost"}
          className={item.archived ? "h-8 w-8" : "h-8 w-8 text-destructive hover:text-destructive"}
          title={item.archived ? adminTranslations.projects.restore : adminTranslations.projects.archive}
          onClick={() =>
            archiveMutation.mutate({ id: item.id, archived: !item.archived })
          }
        >
          {item.archived ? (
            <ArchiveRestore className="w-4 h-4" />
          ) : (
            <Archive className="w-4 h-4" />
          )}
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
            {adminTranslations.projects.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {adminTranslations.projects.description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 w-full">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={adminTranslations.projects.searchPlaceholder}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="whitespace-nowrap">
              {adminTranslations.projects.showArchived}
            </Label>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
          <div className="p-2 sm:p-4 lg:p-6">
            <DataTable data={projects} columns={columns} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProjectsManagement;
