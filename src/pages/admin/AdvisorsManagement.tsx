import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminTranslations as t } from "@/constants/adminTranslations";
import AdminLayout from "@/components/admin/AdminLayout";
import { SearchBar } from "@/components/admin/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Power, Mail, Phone, MapPin, Calendar, Building } from "lucide-react";
import { logAdminAction } from "@/lib/auditLog";
import { CreateAdvisorDialog } from "@/components/admin/CreateAdvisorDialog";
import { EditAdvisorDialog } from "@/components/admin/EditAdvisorDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

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

  const AdvisorCard = ({ advisor }: { advisor: Advisor }) => (
    <Card className="hover:shadow-md transition-all duration-300 border-border/50 overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-5 h-5 text-primary shrink-0" />
              <h3 className="font-bold text-lg truncate">{advisor.company_name || "ללא שם"}</h3>
            </div>
            {advisor.profiles?.name && (
              <p className="text-sm text-muted-foreground truncate">{advisor.profiles.name}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Badge variant={advisor.admin_approved ? "default" : "secondary"} className="shrink-0">
              {advisor.admin_approved ? t.advisors.status.approved : t.advisors.status.pending}
            </Badge>
            <Badge variant={advisor.is_active ? "default" : "destructive"} className="shrink-0">
              {advisor.is_active ? t.advisors.status.active : t.advisors.status.inactive}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {advisor.profiles?.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0" />
              <span className="truncate">{advisor.profiles.email}</span>
            </div>
          )}
          {advisor.profiles?.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4 shrink-0" />
              <span className="truncate">{advisor.profiles.phone}</span>
            </div>
          )}
          {advisor.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{advisor.location}</span>
            </div>
          )}
          {advisor.founding_year && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{advisor.founding_year}</span>
            </div>
          )}
        </div>

        {advisor.expertise && advisor.expertise.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">תחומי מומחיות</p>
              <div className="flex gap-1 flex-wrap">
                {advisor.expertise.slice(0, 3).map((exp, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {exp}
                  </Badge>
                ))}
                {advisor.expertise.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{advisor.expertise.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          {!advisor.admin_approved ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => toggleApprovalMutation.mutate({ advisorId: advisor.id, approve: true })}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 ml-2" />
                {t.advisors.approve}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleApprovalMutation.mutate({ advisorId: advisor.id, approve: false })}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 ml-2" />
                {t.advisors.reject}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleActiveMutation.mutate({ advisorId: advisor.id, isActive: advisor.is_active || false })}
              className="flex-1"
            >
              <Power className="h-4 w-4 ml-2" />
              {advisor.is_active ? t.advisors.status.inactive : t.advisors.status.active}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedAdvisor(advisor);
              setEditDialogOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setSelectedAdvisor(advisor);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              {t.advisors.title}
            </h1>
            <p className="text-muted-foreground mt-1">ניהול וניטור יועצים במערכת</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 ml-2" />
            {t.advisors.createButton}
          </Button>
        </div>

        <div className="space-y-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t.advisors.searchPlaceholder}
          />

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
              size="sm"
            >
              {t.advisors.filters.all}
              <Badge variant="secondary" className="mr-2">
                {advisors.length}
              </Badge>
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
              size="sm"
            >
              {t.advisors.filters.pending}
              <Badge variant="secondary" className="mr-2">
                {advisors.filter(a => !a.admin_approved).length}
              </Badge>
            </Button>
            <Button
              variant={statusFilter === "approved" ? "default" : "outline"}
              onClick={() => setStatusFilter("approved")}
              size="sm"
            >
              {t.advisors.filters.approved}
              <Badge variant="secondary" className="mr-2">
                {advisors.filter(a => a.admin_approved).length}
              </Badge>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted/20" />
            ))}
          </div>
        ) : filteredAdvisors.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                <Building className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">אין יועצים להצגה</h3>
              <p className="text-muted-foreground">נסה לשנות את הסינון או החיפוש</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAdvisors.map((advisor) => (
              <AdvisorCard key={advisor.id} advisor={advisor} />
            ))}
          </div>
        )}

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
