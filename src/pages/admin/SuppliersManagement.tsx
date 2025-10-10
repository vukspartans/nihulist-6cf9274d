import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { SearchBar } from "@/components/admin/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/auditLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Entrepreneur {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  created_at: string;
}

interface Advisor {
  id: string;
  user_id: string;
  company_name: string | null;
  location: string | null;
  is_active: boolean;
  admin_approved: boolean;
  created_at: string;
  expertise: string[];
  founding_year: number | null;
  office_size: string | null;
  position_in_office: string | null;
  profiles: {
    email: string | null;
    phone: string | null;
    name: string | null;
  };
}

const SuppliersManagement = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const queryClient = useQueryClient();

  // Fetch advisors
  const { data: advisors = [], isLoading: advisorsLoading } = useQuery({
    queryKey: ['admin-advisors', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('advisors')
        .select(`
          *,
          profiles!advisors_user_id_fkey(email, phone, name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        query = query.eq('admin_approved', false);
      } else if (statusFilter === 'approved') {
        query = query.eq('admin_approved', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Type cast the data properly
      const advisorsData = (data || []).map(advisor => ({
        ...advisor,
        profiles: advisor.profiles || { email: null, phone: null, name: null }
      }));

      // Apply search filter client-side if needed
      if (search) {
        return advisorsData.filter((advisor: any) => 
          advisor.company_name?.toLowerCase().includes(search.toLowerCase()) ||
          advisor.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
          advisor.profiles?.name?.toLowerCase().includes(search.toLowerCase())
        ) as Advisor[];
      }

      return advisorsData as Advisor[];
    },
  });

  // Fetch entrepreneurs
  const { data: entrepreneurs = [], isLoading: entrepreneursLoading } = useQuery({
    queryKey: ['admin-entrepreneurs', search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'entrepreneur')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Apply search filter client-side if needed
      if (search) {
        return (data || []).filter((entrepreneur: any) => 
          entrepreneur.name?.toLowerCase().includes(search.toLowerCase()) ||
          entrepreneur.email?.toLowerCase().includes(search.toLowerCase()) ||
          entrepreneur.company_name?.toLowerCase().includes(search.toLowerCase())
        ) as Entrepreneur[];
      }

      return data as Entrepreneur[];
    },
  });

  // Approve/Reject advisor mutation
  const toggleAdvisorApprovalMutation = useMutation({
    mutationFn: async ({ id, admin_approved }: { id: string; admin_approved: boolean }) => {
      const oldData = advisors.find(a => a.id === id);
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData = {
        admin_approved,
        approved_at: admin_approved ? new Date().toISOString() : null,
        approved_by: admin_approved ? user?.id : null,
      };
      
      const { data, error } = await supabase
        .from('advisors')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      await logAdminAction('update', 'advisors', id, oldData, updateData);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-advisors'] });
      toast.success(variables.admin_approved ? 'היועץ אושר בהצלחה' : 'היועץ נדחה');
    },
    onError: (error: any) => {
      toast.error(error.message || 'שגיאה בעדכון סטטוס היועץ');
    },
  });

  const entrepreneurColumns: Column<Entrepreneur>[] = [
    { 
      header: "שם", 
      cell: (item) => item.name || 'לא צוין'
    },
    { 
      header: "אימייל", 
      cell: (item) => item.email || 'לא צוין'
    },
    { 
      header: "טלפון", 
      cell: (item) => item.phone || 'לא צוין'
    },
    { 
      header: "שם החברה", 
      cell: (item) => item.company_name || 'לא צוין'
    },
    { 
      header: "תאריך הרשמה", 
      cell: (item) => new Date(item.created_at).toLocaleDateString('he-IL')
    },
  ];

  const advisorColumns: Column<Advisor>[] = [
    { 
      header: "שם המשרד", 
      cell: (item) => item.company_name || 'לא צוין'
    },
    { 
      header: "איש קשר", 
      cell: (item) => item.profiles?.name || 'לא צוין'
    },
    { 
      header: "אימייל", 
      cell: (item) => item.profiles?.email || 'לא צוין'
    },
    { 
      header: "מיקום", 
      cell: (item) => item.location || 'לא צוין'
    },
    { 
      header: "שנת ייסוד", 
      cell: (item) => item.founding_year || 'לא צוין'
    },
    {
      header: "סטטוס אישור",
      cell: (item) => (
        <Badge variant={item.admin_approved ? "default" : "secondary"}>
          {item.admin_approved ? "מאושר" : "ממתין לאישור"}
        </Badge>
      ),
    },
    {
      header: "חשבון פעיל",
      cell: (item) => (
        <Badge variant={item.is_active ? "default" : "destructive"}>
          {item.is_active ? "פעיל" : "מושהה"}
        </Badge>
      ),
    },
    {
      header: "פעולות",
      cell: (item) => (
        <div className="flex gap-2">
          {!item.admin_approved ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                if (confirm('האם לאשר את היועץ?')) {
                  toggleAdvisorApprovalMutation.mutate({ id: item.id, admin_approved: true });
                }
              }}
            >
              <ShieldCheck className="w-4 h-4 ml-1" />
              אשר
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm('האם להסיר את האישור של היועץ?')) {
                  toggleAdvisorApprovalMutation.mutate({ id: item.id, admin_approved: false });
                }
              }}
            >
              <XCircle className="w-4 h-4 ml-1" />
              בטל אישור
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
            <p className="text-muted-foreground mt-1">
              נהל יועצים ויזמים, אשר או דחה בקשות
            </p>
          </div>
        </div>

        <Tabs defaultValue="advisors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="advisors">יועצים</TabsTrigger>
            <TabsTrigger value="entrepreneurs">יזמים</TabsTrigger>
          </TabsList>

          <TabsContent value="advisors" className="space-y-4">
            <div className="flex gap-4 items-center">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="חפש יועץ..."
              />
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  הכל
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                >
                  ממתינים לאישור
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('approved')}
                >
                  מאושרים
                </Button>
              </div>
            </div>

            <DataTable data={advisors} columns={advisorColumns} />
          </TabsContent>

          <TabsContent value="entrepreneurs" className="space-y-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="חפש יזם..."
            />

            <DataTable data={entrepreneurs} columns={entrepreneurColumns} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default SuppliersManagement;
