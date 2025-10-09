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
      toast.success("RFP deleted successfully");
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
      toast.success("Proposal status updated");
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
      toast.success("Proposal deleted successfully");
    },
  });

  const rfpColumns: Column<RFP>[] = [
    { header: "Subject", accessorKey: "subject" },
    {
      header: "Sent At",
      cell: (item) => new Date(item.sent_at).toLocaleDateString(),
    },
    { header: "Project ID", accessorKey: "project_id" },
    {
      header: "Actions",
      cell: (item) => (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (confirm("Delete this RFP? This will cascade to invites.")) {
              deleteRFPMutation.mutate(item.id);
            }
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const proposalColumns: Column<Proposal>[] = [
    { header: "Supplier", accessorKey: "supplier_name" },
    {
      header: "Price",
      cell: (item) => `₪${item.price.toLocaleString()}`,
    },
    {
      header: "Timeline",
      cell: (item) => `${item.timeline_days} days`,
    },
    {
      header: "Status",
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
          {item.status}
        </Badge>
      ),
    },
    {
      header: "Submitted",
      cell: (item) => new Date(item.submitted_at).toLocaleDateString(),
    },
    {
      header: "Actions",
      cell: (item) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateProposalMutation.mutate({ id: item.id, status: 'approved' })
            }
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              updateProposalMutation.mutate({ id: item.id, status: 'rejected' })
            }
          >
            <XCircle className="w-4 h-4 mr-1" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm("Delete this proposal?")) {
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">RFPs & Proposals</h1>
          <p className="text-muted-foreground mt-1">
            Manage RFPs and submitted proposals
          </p>
        </div>

        <Tabs defaultValue="rfps">
          <TabsList>
            <TabsTrigger value="rfps">RFPs ({rfps.length})</TabsTrigger>
            <TabsTrigger value="proposals">
              Proposals ({proposals.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="rfps" className="mt-6">
            <DataTable data={rfps} columns={rfpColumns} />
          </TabsContent>
          <TabsContent value="proposals" className="mt-6">
            <DataTable data={proposals} columns={proposalColumns} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default RFPsManagement;
