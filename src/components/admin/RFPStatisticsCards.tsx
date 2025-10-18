import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "./StatsCard";
import { FileText, Send, TrendingUp, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminTranslations } from "@/constants/adminTranslations";

export function RFPStatisticsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['rfp-statistics'],
    queryFn: async () => {
      // Fetch all data in parallel
      const [rfpsResult, invitesResult, proposalsResult] = await Promise.all([
        supabase.from('rfps').select('*', { count: 'exact', head: true }),
        supabase.from('rfp_invites').select('*', { count: 'exact', head: true }),
        supabase.from('proposals').select('status'),
      ]);
      
      const totalRFPs = rfpsResult.count || 0;
      const totalInvites = invitesResult.count || 0;
      const totalProposals = proposalsResult.data?.length || 0;
      const approvedProposals = proposalsResult.data?.filter(p => p.status === 'approved').length || 0;
      
      // Calculate rates
      const responseRate = totalInvites > 0 
        ? ((totalProposals / totalInvites) * 100).toFixed(1) 
        : '0.0';
      
      const approvalRate = totalProposals > 0
        ? ((approvedProposals / totalProposals) * 100).toFixed(1)
        : '0.0';
      
      return {
        totalRFPs,
        totalInvites,
        totalProposals,
        approvedProposals,
        responseRate,
        approvalRate,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" dir="rtl">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" dir="rtl">
      <StatsCard
        title={adminTranslations.rfps.statistics.totalRFPs}
        value={stats?.totalRFPs || 0}
        description={adminTranslations.rfps.statistics.rfpsDesc}
        icon={FileText}
      />
      
      <StatsCard
        title={adminTranslations.rfps.statistics.totalInvites}
        value={stats?.totalInvites || 0}
        description={adminTranslations.rfps.statistics.invitesDesc}
        icon={Send}
      />
      
      <StatsCard
        title={adminTranslations.rfps.statistics.responseRate}
        value={`${stats?.responseRate || '0.0'}%`}
        description={adminTranslations.rfps.statistics.responseDesc}
        icon={TrendingUp}
      />
      
      <StatsCard
        title={adminTranslations.rfps.statistics.approvalRate}
        value={`${stats?.approvalRate || '0.0'}%`}
        description={adminTranslations.rfps.statistics.approvalDesc}
        icon={CheckCircle2}
      />
    </div>
  );
}
