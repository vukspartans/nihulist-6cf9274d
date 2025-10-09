import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { Building2, FolderKanban, FileText, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [suppliers, projects, rfps, proposals] = await Promise.all([
        supabase.from('suppliers').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('rfps').select('*', { count: 'exact', head: true }),
        supabase.from('proposals').select('status', { count: 'exact' }),
      ]);

      const approvedProposals = proposals.data?.filter(p => p.status === 'approved').length || 0;

      return {
        suppliers: suppliers.count || 0,
        projects: projects.count || 0,
        rfps: rfps.count || 0,
        proposals: proposals.count || 0,
        approvedProposals,
      };
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your platform's key metrics
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Suppliers"
              value={stats?.suppliers || 0}
              description="Active suppliers in the system"
              icon={Building2}
            />
            <StatsCard
              title="Total Projects"
              value={stats?.projects || 0}
              description="Projects created"
              icon={FolderKanban}
            />
            <StatsCard
              title="RFPs Sent"
              value={stats?.rfps || 0}
              description="Requests for proposals"
              icon={FileText}
            />
            <StatsCard
              title="Proposals Received"
              value={stats?.proposals || 0}
              description={`${stats?.approvedProposals || 0} approved`}
              icon={CheckCircle2}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
