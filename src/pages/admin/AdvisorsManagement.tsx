import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminTranslations as t } from "@/constants/adminTranslations";
import AdminLayout from "@/components/admin/AdminLayout";
import { SearchBar } from "@/components/admin/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Power, Upload } from "lucide-react";
import { logAdminAction } from "@/lib/auditLog";
import { CreateAdvisorDialog } from "@/components/admin/CreateAdvisorDialog";
import { EditAdvisorDialog } from "@/components/admin/EditAdvisorDialog";
import { BulkAdvisorUpload } from "@/components/admin/BulkAdvisorUpload";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
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
          <div className="flex gap-2">
            <Button onClick={() => setBulkUploadOpen(true)} variant="outline" className="shrink-0" size="default">
              <Upload className="h-4 w-4 ml-2" />
              העלאה באצווה
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="shrink-0" size="default">
              <Plus className="h-4 w-4 ml-2" />
              {t.advisors.createButton}
            </Button>
          </div>
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
              <Badge variant="secondary" className="mr-2 text-xs">
                {advisors.length}
              </Badge>
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
              size="sm"
            >
              {t.advisors.filters.pending}
              <Badge variant="secondary" className="mr-2 text-xs">
                {advisors.filter(a => !a.admin_approved).length}
              </Badge>
            </Button>
            <Button
              variant={statusFilter === "approved" ? "default" : "outline"}
              onClick={() => setStatusFilter("approved")}
              size="sm"
            >
              {t.advisors.filters.approved}
              <Badge variant="secondary" className="mr-2 text-xs">
                {advisors.filter(a => a.admin_approved).length}
              </Badge>
            </Button>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">חברה</TableHead>
                  <TableHead className="font-semibold">איש קשר</TableHead>
                  <TableHead className="font-semibold">אימייל</TableHead>
                  <TableHead className="font-semibold">טלפון</TableHead>
                  <TableHead className="font-semibold">מיקום</TableHead>
                  <TableHead className="font-semibold">תחומי מומחיות</TableHead>
                  <TableHead className="font-semibold text-center">סטטוס</TableHead>
                  <TableHead className="font-semibold text-center w-[200px]">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredAdvisors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <p className="font-medium">אין יועצים להצגה</p>
                        <p className="text-sm">נסה לשנות את הסינון או החיפוש</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAdvisors.map((advisor) => (
                    <TableRow key={advisor.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">
                        {advisor.company_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {advisor.profiles?.name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {advisor.profiles?.email || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {advisor.profiles?.phone || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {advisor.location || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-[180px]">
                          {advisor.expertise && advisor.expertise.length > 0 ? (
                            <>
                              {advisor.expertise.slice(0, 2).map((exp, i) => (
                                <Badge key={i} variant="secondary" className="text-xs px-2 py-0">
                                  {exp}
                                </Badge>
                              ))}
                              {advisor.expertise.length > 2 && (
                                <Badge variant="outline" className="text-xs px-2 py-0">
                                  +{advisor.expertise.length - 2}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-center">
                          <Badge 
                            variant={advisor.admin_approved ? "default" : "secondary"} 
                            className="text-xs w-fit"
                          >
                            {advisor.admin_approved ? "מאושר" : "ממתין"}
                          </Badge>
                          <Badge 
                            variant={advisor.is_active ? "default" : "destructive"} 
                            className="text-xs w-fit"
                          >
                            {advisor.is_active ? "פעיל" : "לא פעיל"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center flex-wrap">
                          {!advisor.admin_approved ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleApprovalMutation.mutate({ advisorId: advisor.id, approve: true })}
                                title="אישור"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleApprovalMutation.mutate({ advisorId: advisor.id, approve: false })}
                                title="דחייה"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleActiveMutation.mutate({ advisorId: advisor.id, isActive: advisor.is_active || false })}
                              title={advisor.is_active ? "השבת" : "הפעל"}
                            >
                              <Power className={`h-4 w-4 ${advisor.is_active ? 'text-orange-600' : 'text-green-600'}`} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedAdvisor(advisor);
                              setEditDialogOpen(true);
                            }}
                            title="עריכה"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedAdvisor(advisor);
                              setDeleteDialogOpen(true);
                            }}
                            title="מחיקה"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <CreateAdvisorDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        <BulkAdvisorUpload
          open={bulkUploadOpen}
          onOpenChange={setBulkUploadOpen}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["advisors"] })}
        />

        {selectedAdvisor && (
          <EditAdvisorDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            advisor={selectedAdvisor}
          />
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader className="text-right">
              <AlertDialogTitle>{t.advisors.deleteButton}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.advisors.deleteConfirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogAction
                onClick={() => selectedAdvisor && deleteMutation.mutate(selectedAdvisor.user_id)}
              >
                {t.advisors.deleteButton}
              </AlertDialogAction>
              <AlertDialogCancel>{t.advisors.createDialog.cancelButton}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
