import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/auditLog";
import { adminTranslations } from "@/constants/adminTranslations";

interface RFP {
  id: string;
  subject: string;
  sent_at: string;
  project_id: string;
  sent_by: string;
}

interface Proposal {
  id: string;
  supplier_name: string;
  price: number;
  timeline_days: number;
  status: string;
  submitted_at: string;
  project_id: string;
}

const RFPsManagement = () => {
  const queryClient = useQueryClient();

  const { data: rfps = [] } = useQuery({
    queryKey: ['admin-rfps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfps')
        .select('*')
        .order('sent_at', { ascending: false });
      
      if (error) throw error;
      return data as RFP[];
    },
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['admin-proposals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data as Proposal[];
    },
  });

  const deleteRFPMutation = useMutation({
    mutationFn: async (id: string) => {
      const oldData = rfps.find(r => r.id === id);
      const { error } = await supabase
        .from('rfps')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await logAdminAction('delete', 'rfps', id, oldData, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rfps'] });
      toast.success(adminTranslations.rfps.deleted);
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const oldData = proposals.find(p => p.id === id);
      const { error } = await supabase
        .from('proposals')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      await logAdminAction('update', 'proposals', id, oldData, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-proposals'] });
      toast.success(adminTranslations.rfps.statusUpdated);
    },
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (id: string) => {
      const oldData = proposals.find(p => p.id === id);
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await logAdminAction('delete', 'proposals', id, oldData, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-proposals'] });
      toast.success(adminTranslations.rfps.deleted);
    },
  });

  const rfpColumns: Column<RFP>[] = [
    { header: adminTranslations.rfps.subject, accessorKey: "subject" },
    {
      header: adminTranslations.rfps.sentAt,
      cell: (item) => new Date(item.sent_at).toLocaleDateString('he-IL'),
    },
    { header: adminTranslations.rfps.projectId, accessorKey: "project_id" },
    {
      header: adminTranslations.rfps.actions,
      cell: (item) => (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (confirm(adminTranslations.rfps.deleteRFPConfirm)) {
              deleteRFPMutation.mutate(item.id);
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received': return adminTranslations.rfps.received;
      case 'approved': return adminTranslations.rfps.approved;
      case 'rejected': return adminTranslations.rfps.rejected;
      default: return status;
    }
  };

  const proposalColumns: Column<Proposal>[] = [
    { header: adminTranslations.rfps.supplier, accessorKey: "supplier_name" },
    {
      header: adminTranslations.rfps.price,
      cell: (item) => `₪${item.price.toLocaleString('he-IL')}`,
    },
    {
      header: adminTranslations.rfps.timeline,
      cell: (item) => `${item.timeline_days} ${adminTranslations.rfps.days}`,
    },
    {
      header: adminTranslations.rfps.status,
      cell: (item) => (
        <Badge
          variant={
            item.status === 'approved'
              ? 'default'
              : item.status === 'rejected'
              ? 'destructive'
              : 'secondary'
          }
        >
          {getStatusText(item.status)}
        </Badge>
      ),
    },
    {
      header: adminTranslations.rfps.submitted,
      cell: (item) => new Date(item.submitted_at).toLocaleDateString('he-IL'),
    },
    {
      header: adminTranslations.rfps.actions,
      cell: (item) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateProposalMutation.mutate({ id: item.id, status: 'approved' })
            }
          >
            <CheckCircle2 className="w-4 h-4 ml-1" />
            {adminTranslations.rfps.approve}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateProposalMutation.mutate({ id: item.id, status: 'rejected' })
            }
          >
            <XCircle className="w-4 h-4 ml-1" />
            {adminTranslations.rfps.reject}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm(adminTranslations.rfps.deleteProposalConfirm)) {
                deleteProposalMutation.mutate(item.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
            {adminTranslations.rfps.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {adminTranslations.rfps.description}
          </p>
        </div>

        <Tabs defaultValue="rfps" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="rfps">
              {adminTranslations.rfps.rfpsTab} ({rfps.length})
            </TabsTrigger>
            <TabsTrigger value="proposals">
              {adminTranslations.rfps.proposalsTab} ({proposals.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="rfps" className="mt-6">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 lg:p-6 shadow-sm overflow-x-auto">
              <DataTable data={rfps} columns={rfpColumns} />
            </div>
          </TabsContent>
          <TabsContent value="proposals" className="mt-6">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 lg:p-6 shadow-sm overflow-x-auto">
              <DataTable data={proposals} columns={proposalColumns} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default RFPsManagement;
