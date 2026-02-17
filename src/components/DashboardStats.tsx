import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, TrendingUp, Users, FileText, Coins, ClipboardList, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    projectsWithRfps: 0,
    rfpsSent: 0,
    totalProposals: 0,
    pendingPayments: 0,
    totalTasks: 0,
    delayedTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== user.id) {
        setTimeout(fetchStats, 500);
        return;
      }

      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', user.id)
        .neq('status', 'deleted');

      const projectIds = projects?.map(p => p.id) || [];

      if (projectIds.length === 0) {
        setStats({ totalProjects: 0, projectsWithRfps: 0, rfpsSent: 0, totalProposals: 0, pendingPayments: 0, totalTasks: 0, delayedTasks: 0 });
        setLoading(false);
        return;
      }

      const [rfpsRes, proposalsRes, paymentsRes, tasksRes, delayedRes] = await Promise.all([
        supabase.from('rfps').select('id, project_id').eq('sent_by', user.id),
        supabase.from('proposals').select('id').in('project_id', projectIds),
        supabase.from('payment_requests').select('id, status').in('project_id', projectIds).not('status', 'in', '("paid","rejected")'),
        supabase.from('project_tasks').select('id').in('project_id', projectIds).not('status', 'in', '("completed","cancelled")'),
        supabase.from('project_tasks').select('id, status, planned_end_date').in('project_id', projectIds).not('status', 'in', '("completed","cancelled")'),
      ]);

      const projectsWithRFPs = new Set(rfpsRes.data?.map(r => r.project_id) || []);
      const now = new Date().toISOString();
      const delayed = (delayedRes.data || []).filter(t =>
        t.status === 'delayed' || (t.planned_end_date && t.planned_end_date < now)
      );

      setStats({
        totalProjects: projects?.length || 0,
        projectsWithRfps: projectsWithRFPs.size,
        rfpsSent: rfpsRes.data?.length || 0,
        totalProposals: proposalsRes.data?.length || 0,
        pendingPayments: paymentsRes.data?.length || 0,
        totalTasks: tasksRes.data?.length || 0,
        delayedTasks: delayed.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 md:p-5">
                <div className="h-3 bg-muted rounded mb-2" />
                <div className="h-6 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 md:p-5">
                <div className="h-3 bg-muted rounded mb-2" />
                <div className="h-6 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const delayedPct = stats.totalTasks > 0
    ? Math.round((stats.delayedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
      {/* Row 1 – existing stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        <StatCard label="פרויקטים" value={stats.totalProjects} icon={<BarChart className="w-4 h-4 md:w-5 md:h-5 text-primary" />} />
        <StatCard label="עם בקשות" value={stats.projectsWithRfps} icon={<TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-success" />} />
        <StatCard label="בקשות" value={stats.rfpsSent} icon={<FileText className="w-4 h-4 md:w-5 md:h-5 text-accent" />} />
        <StatCard label="הצעות" value={stats.totalProposals} icon={<Users className="w-4 h-4 md:w-5 md:h-5 text-info" />} />
      </div>

      {/* Row 2 – new stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatCard label="תשלומים לטיפול" value={stats.pendingPayments} icon={<Coins className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />} />
        <StatCard label="משימות" value={stats.totalTasks} icon={<ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-primary" />} />
        <StatCard
          label="משימות באיחור"
          value={stats.delayedTasks}
          icon={<AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-destructive" />}
          subtitle={stats.totalTasks > 0 ? `${stats.delayedTasks} מתוך ${stats.totalTasks} (${delayedPct}%)` : undefined}
        />
      </div>
    </div>
  );
};

function StatCard({ label, value, icon, subtitle }: { label: string; value: number; icon: React.ReactNode; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-3 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">{label}</p>
            <p className="text-lg md:text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-[9px] md:text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="p-1.5 md:p-2.5 rounded-full bg-muted shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
