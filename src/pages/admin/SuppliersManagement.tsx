import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { SearchBar } from "@/components/admin/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Download, Upload, Trash2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/auditLog";
import Papa from "papaparse";
import { adminTranslations } from "@/constants/adminTranslations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  field: string | null;
  region: string | null;
  rating: number | null;
  verified: boolean;
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
  const [showDialog, setShowDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    field: "",
    region: "",
    verified: false,
  });
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

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['admin-suppliers', search],
    queryFn: async () => {
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (supplier: typeof formData) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplier])
        .select()
        .single();
      
      if (error) throw error;
      await logAdminAction('create', 'suppliers', data.id, null, supplier);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success(adminTranslations.suppliers.created);
      setShowDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || adminTranslations.suppliers.createFailed);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: typeof formData }) => {
      const oldData = suppliers.find(s => s.id === id);
      const { data, error } = await supabase
        .from('suppliers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      await logAdminAction('update', 'suppliers', id, oldData, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success(adminTranslations.suppliers.updated);
      setShowDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || adminTranslations.suppliers.updateFailed);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const oldData = suppliers.find(s => s.id === id);
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await logAdminAction('delete', 'suppliers', id, oldData, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success(adminTranslations.suppliers.deleted);
    },
    onError: (error: any) => {
      toast.error(error.message || adminTranslations.suppliers.deleteFailed);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      field: "",
      region: "",
      verified: false,
    });
    setEditingSupplier(null);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      field: supplier.field || "",
      region: supplier.region || "",
      verified: supplier.verified,
    });
    setShowDialog(true);
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(suppliers);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers-${new Date().toISOString()}.csv`;
    a.click();
    toast.success(adminTranslations.suppliers.csvExported);
  };

  const columns: Column<Supplier>[] = [
    { header: adminTranslations.suppliers.name, accessorKey: "name" },
    { header: adminTranslations.suppliers.email, accessorKey: "email" },
    { header: adminTranslations.suppliers.field, accessorKey: "field" },
    { header: adminTranslations.suppliers.region, accessorKey: "region" },
    {
      header: adminTranslations.suppliers.rating,
      cell: (item) => item.rating ? item.rating.toFixed(1) : adminTranslations.suppliers.na,
    },
    {
      header: adminTranslations.suppliers.verified,
      cell: (item) => (
        <Badge variant={item.verified ? "default" : "secondary"}>
          {item.verified ? adminTranslations.suppliers.yes : adminTranslations.suppliers.no}
        </Badge>
      ),
    },
    {
      header: adminTranslations.suppliers.actions,
      cell: (item) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
            {adminTranslations.suppliers.edit}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm(adminTranslations.suppliers.deleteConfirm)) {
                deleteMutation.mutate(item.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
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
            <h1 className="text-3xl font-bold">ניהול ספקים ויועצים</h1>
            <p className="text-muted-foreground mt-1">
              נהל ספקים ויועצים, אשר או דחה בקשות
            </p>
          </div>
        </div>

        <Tabs defaultValue="advisors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="advisors">יועצים</TabsTrigger>
            <TabsTrigger value="suppliers">ספקים</TabsTrigger>
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

          <TabsContent value="suppliers" className="space-y-4">
            <div className="flex justify-between items-center">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={adminTranslations.suppliers.searchPlaceholder}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 ml-2" />
                  {adminTranslations.suppliers.exportCSV}
                </Button>
                <Button onClick={() => setShowDialog(true)}>
                  <Plus className="w-4 h-4 ml-2" />
                  {adminTranslations.suppliers.addSupplier}
                </Button>
              </div>
            </div>

            <DataTable data={suppliers} columns={columns} />
          </TabsContent>
        </Tabs>

        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) resetForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? adminTranslations.suppliers.editSupplier : adminTranslations.suppliers.addSupplier}
              </DialogTitle>
              <DialogDescription>
                {editingSupplier
                  ? adminTranslations.suppliers.updateSupplierInfo
                  : adminTranslations.suppliers.addNewSupplier}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{adminTranslations.suppliers.name} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{adminTranslations.suppliers.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{adminTranslations.suppliers.phone}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field">{adminTranslations.suppliers.field}</Label>
                <Input
                  id="field"
                  value={formData.field}
                  onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">{adminTranslations.suppliers.region}</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verified"
                  checked={formData.verified}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, verified: checked as boolean })
                  }
                />
                <Label htmlFor="verified">{adminTranslations.suppliers.verified}</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  {adminTranslations.suppliers.cancel}
                </Button>
                <Button type="submit">
                  {editingSupplier ? adminTranslations.suppliers.update : adminTranslations.suppliers.create}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default SuppliersManagement;
