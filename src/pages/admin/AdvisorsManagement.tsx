import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminTranslations as t } from "@/constants/adminTranslations";
import AdminLayout from "@/components/admin/AdminLayout";
import { SearchBar } from "@/components/admin/SearchBar";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Power } from "lucide-react";
import { logAdminAction } from "@/lib/auditLog";
import { CreateAdvisorDialog } from "@/components/admin/CreateAdvisorDialog";
import { EditAdvisorDialog } from "@/components/admin/EditAdvisorDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Advisor {
  id: string;
  user_id: string;
  company_name: string | null;
  location: string | null;
  phone: string | null;
  founding_year: number | null;
  expertise: string[] | null;
  specialties: string[] | null;
  activity_regions: string[] | null;
  office_size: string | null;
  position_in_office: string | null;
  admin_approved: boolean;
  is_active: boolean;
  created_at: string;
  profiles: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export default function AdvisorsManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch advisors with profile data
  const { data: advisorsData = [], isLoading } = useQuery({
    queryKey: ["advisors", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advisors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile data separately for each advisor
      const advisorsWithProfiles = await Promise.all(
        data.map(async (advisor) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name, email, phone")
            .eq("user_id", advisor.user_id)
            .maybeSingle();

          return {
            ...advisor,
            phone: profileData?.phone || advisor.office_phone || null,
            profiles: profileData || { name: null, email: null, phone: null },
          };
        })
      );

      return advisorsWithProfiles as Advisor[];
    },
  });

  const advisors = advisorsData;

  // Filter advisors
  const filteredAdvisors = advisors.filter((advisor) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      advisor.company_name?.toLowerCase().includes(search) ||
      advisor.profiles?.name?.toLowerCase().includes(search) ||
      advisor.profiles?.email?.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && !advisor.admin_approved) ||
      (statusFilter === "approved" && advisor.admin_approved);

    return matchesSearch && matchesStatus;
  });

  // Approve/Reject mutation
  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ advisorId, approve }: { advisorId: string; approve: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("advisors")
        .update({
          admin_approved: approve,
          approved_at: approve ? new Date().toISOString() : null,
          approved_by: approve && user ? user.id : null,
        })
        .eq("id", advisorId);

      if (error) throw error;
    },
    onSuccess: async (_, { advisorId, approve }) => {
      await logAdminAction(
        "update",
        "advisors",
        advisorId,
        null,
        { admin_approved: approve }
      );
      queryClient.invalidateQueries({ queryKey: ["advisors"] });
      toast({
        title: approve ? t.advisors.messages.approved : t.advisors.messages.rejected,
      });
    },
    onError: (error) => {
      console.error("Error toggling approval:", error);
      toast({
        title: t.advisors.messages.error,
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ advisorId, isActive }: { advisorId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("advisors")
        .update({ is_active: !isActive })
        .eq("id", advisorId);

      if (error) throw error;
    },
    onSuccess: async (_, { advisorId }) => {
      await logAdminAction("update", "advisors", advisorId);
      queryClient.invalidateQueries({ queryKey: ["advisors"] });
      toast({
        title: t.advisors.messages.toggled,
      });
    },
    onError: (error) => {
      console.error("Error toggling active status:", error);
      toast({
        title: t.advisors.messages.error,
        variant: "destructive",
      });
    },
  });

  // Delete advisor mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: async (_, userId) => {
      await logAdminAction("delete", "advisors", userId);
      queryClient.invalidateQueries({ queryKey: ["advisors"] });
      toast({
        title: t.advisors.messages.deleted,
      });
      setDeleteDialogOpen(false);
      setSelectedAdvisor(null);
    },
    onError: (error) => {
      console.error("Error deleting advisor:", error);
      toast({
        title: t.advisors.messages.error,
        variant: "destructive",
      });
    },
  });

  const columns: Column<Advisor>[] = [
    {
      header: t.advisors.columns.companyName,
      accessorKey: "company_name",
    },
    {
      header: t.advisors.columns.contactPerson,
      cell: (advisor) => advisor.profiles?.name || "-",
    },
    {
      header: t.advisors.columns.email,
      cell: (advisor) => advisor.profiles?.email || "-",
    },
    {
      header: t.advisors.columns.phone,
      cell: (advisor) => advisor.profiles?.phone || "-",
    },
    {
      header: t.advisors.columns.location,
      accessorKey: "location",
    },
    {
      header: t.advisors.columns.foundingYear,
      accessorKey: "founding_year",
    },
    {
      header: t.advisors.columns.expertise,
      cell: (advisor) => (
        <div className="flex gap-1 flex-wrap max-w-xs">
          {advisor.expertise?.slice(0, 2).map((exp, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {exp}
            </Badge>
          ))}
          {advisor.expertise && advisor.expertise.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{advisor.expertise.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: t.advisors.columns.approvalStatus,
      cell: (advisor) => (
        <Badge variant={advisor.admin_approved ? "default" : "secondary"}>
          {advisor.admin_approved ? t.advisors.status.approved : t.advisors.status.pending}
        </Badge>
      ),
    },
    {
      header: t.advisors.columns.activeStatus,
      cell: (advisor) => (
        <Badge variant={advisor.is_active ? "default" : "destructive"}>
          {advisor.is_active ? t.advisors.status.active : t.advisors.status.inactive}
        </Badge>
      ),
    },
    {
      header: t.advisors.columns.actions,
      cell: (advisor) => (
        <div className="flex gap-2 flex-wrap">
          {!advisor.admin_approved ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleApprovalMutation.mutate({ advisorId: advisor.id, approve: true });
                }}
              >
                <CheckCircle className="h-4 w-4 ml-2" />
                {t.advisors.approve}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleApprovalMutation.mutate({ advisorId: advisor.id, approve: false });
                }}
              >
                <XCircle className="h-4 w-4 ml-2" />
                {t.advisors.reject}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleActiveMutation.mutate({ advisorId: advisor.id, isActive: advisor.is_active || false });
              }}
            >
              <Power className="h-4 w-4 ml-2" />
              {advisor.is_active ? t.advisors.status.inactive : t.advisors.status.active}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAdvisor(advisor);
              setEditDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4 ml-2" />
            {t.advisors.editButton}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAdvisor(advisor);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 ml-2" />
            {t.advisors.deleteButton}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t.advisors.title}</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            {t.advisors.createButton}
          </Button>
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.advisors.searchPlaceholder}
        />

        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            onClick={() => setStatusFilter("all")}
          >
            {t.advisors.filters.all}
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
          >
            {t.advisors.filters.pending}
          </Button>
          <Button
            variant={statusFilter === "approved" ? "default" : "outline"}
            onClick={() => setStatusFilter("approved")}
          >
            {t.advisors.filters.approved}
          </Button>
        </div>

        <DataTable
          data={filteredAdvisors}
          columns={columns}
        />

        <CreateAdvisorDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        {selectedAdvisor && (
          <EditAdvisorDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            advisor={selectedAdvisor}
          />
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.advisors.deleteButton}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.advisors.deleteConfirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.advisors.createDialog.cancelButton}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedAdvisor && deleteMutation.mutate(selectedAdvisor.user_id)}
              >
                {t.advisors.deleteButton}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
