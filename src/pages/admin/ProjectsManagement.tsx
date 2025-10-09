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
          ? "Project archived successfully"
          : "Project restored successfully"
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Operation failed");
    },
  });

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const columns: Column<Project>[] = [
    { header: "Name", accessorKey: "name" },
    { header: "Type", accessorKey: "type" },
    { header: "Location", accessorKey: "location" },
    {
      header: "Budget",
      cell: (item) => item.budget ? `₪${item.budget.toLocaleString()}` : "N/A",
    },
    {
      header: "Status",
      cell: (item) => (
        <Badge variant={statusBadgeVariant(item.status)}>
          {item.status}
        </Badge>
      ),
    },
    { header: "Phase", accessorKey: "phase" },
    {
      header: "Actions",
      cell: (item) => (
        <Button
          size="sm"
          variant={item.archived ? "outline" : "destructive"}
          onClick={() =>
            archiveMutation.mutate({ id: item.id, archived: !item.archived })
          }
        >
          {item.archived ? (
            <>
              <ArchiveRestore className="w-4 h-4 mr-1" />
              Restore
            </>
          ) : (
            <>
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </>
          )}
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Projects Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all projects in the system
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search projects..."
          />
          <div className="flex items-center space-x-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived">Show archived</Label>
          </div>
        </div>

        <DataTable data={projects} columns={columns} />
      </div>
    </AdminLayout>
  );
};

export default ProjectsManagement;
