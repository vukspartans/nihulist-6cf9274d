import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, TrendingUp, Users, FileText, Clock, Coins, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
interface DashboardStatsData {
  totalProjects: number;
  projectsWithRfps: number;
  rfpsSent: number;
  totalProposals: number;
}
export const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalProjects: 0,
    projectsWithRfps: 0,
    rfpsSent: 0,
    totalProposals: 0
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchStats();
  }, []);
  const fetchStats = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      
      // Wait for valid session to ensure RLS policies work correctly
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== user.id) {
        console.warn('[DashboardStats] Session mismatch, retrying...');
        setTimeout(fetchStats, 500);
        return;
      }
      
      console.log('[DashboardStats] Session verified:', {
        userId: user.id,
        sessionUserId: session.user.id
      });
      
      const {
        data: projects
      } = await supabase.from('projects').select('*').eq('owner_id', user.id).neq('status', 'deleted');
      
      const {
        data: rfps
      } = await supabase.from('rfps').select('id, project_id').eq('sent_by', user.id);
      
      // Get total proposals received for user's projects
      const {
        data: proposals
      } = await supabase
        .from('proposals')
        .select('id, project_id')
        .in('project_id', projects?.map(p => p.id) || []);
      
      // Count projects that have at least one RFP sent
      const projectsWithRFPs = new Set(rfps?.map(r => r.project_id) || []);
      const projectsWithRfpsCount = projectsWithRFPs.size;
      
      setStats({
        totalProjects: projects?.length || 0,
        projectsWithRfps: projectsWithRfpsCount,
        rfpsSent: rfps?.length || 0,
        totalProposals: proposals?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 md:p-6">
              <div className="h-3 md:h-4 bg-muted rounded mb-2"></div>
              <div className="h-6 md:h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6">
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">סה"כ פרויקטים</p>
              <p className="text-xl md:text-2xl font-bold text-foreground">{stats.totalProjects}</p>
            </div>
            <div className="p-2 md:p-3 rounded-full bg-muted">
              <BarChart className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">פרויקטים עם בקשות</p>
              <p className="text-xl md:text-2xl font-bold text-foreground">{stats.projectsWithRfps}</p>
            </div>
            <div className="p-2 md:p-3 rounded-full bg-muted">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">בקשות שנשלחו</p>
              <p className="text-xl md:text-2xl font-bold text-foreground">{stats.rfpsSent}</p>
            </div>
            <div className="p-2 md:p-3 rounded-full bg-muted">
              <FileText className="w-5 h-5 md:w-6 md:h-6 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">הצעות מיועצים</p>
              <p className="text-xl md:text-2xl font-bold text-foreground">{stats.totalProposals}</p>
            </div>
            <div className="p-2 md:p-3 rounded-full bg-muted">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-info" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};