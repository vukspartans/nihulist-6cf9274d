import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { Building2, FolderKanban, FileText, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminTranslations } from "@/constants/adminTranslations";

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [advisors, projects, rfps, proposals] = await Promise.all([
        supabase.from('advisors').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('rfps').select('*', { count: 'exact', head: true }),
        supabase.from('proposals').select('status', { count: 'exact' }),
      ]);

      const approvedProposals = proposals.data?.filter(p => p.status === 'approved').length || 0;

      return {
        advisors: advisors.count || 0,
        projects: projects.count || 0,
        rfps: rfps.count || 0,
        proposals: proposals.count || 0,
        approvedProposals,
      };
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
            {adminTranslations.dashboard.title}
          </h1>
          <p className="text-muted-foreground text-lg">
            {adminTranslations.dashboard.description}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="סך יועצים"
              value={stats?.advisors || 0}
              description="יועצים רשומים במערכת"
              icon={Building2}
            />
            <StatsCard
              title={adminTranslations.dashboard.totalProjects}
              value={stats?.projects || 0}
              description={adminTranslations.dashboard.projectsCreatedDesc}
              icon={FolderKanban}
            />
            <StatsCard
              title={adminTranslations.dashboard.rfpsSent}
              value={stats?.rfps || 0}
              description={adminTranslations.dashboard.requestsForProposalsDesc}
              icon={FileText}
            />
            <StatsCard
              title={adminTranslations.dashboard.proposalsReceived}
              value={stats?.proposals || 0}
              description={`${stats?.approvedProposals || 0} ${adminTranslations.dashboard.approvedCount}`}
              icon={CheckCircle2}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
