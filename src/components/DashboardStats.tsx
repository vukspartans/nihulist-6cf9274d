
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  TrendingUp, 
  Users, 
  FileText, 
  Clock, 
  DollarSign,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStatsData {
  totalProjects: number;
  activeProposals: number;
  pendingProposals: number;
  totalBudget: number;
  projectsByStatus: Record<string, number>;
  avgProjectValue: number;
  completionRate: number;
}

export const DashboardStats = () => {
  const [stats, setStats] = useState({ totalProjects: 0, activeProposals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .neq('status', 'deleted');

      const { data: rfps } = await supabase
        .from('rfps')
        .select('id')
        .eq('sent_by', user.id);

      setStats({
        totalProjects: projects?.length || 0,
        activeProposals: rfps?.length || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">סה"כ פרויקטים</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalProjects}</p>
            </div>
            <div className="p-3 rounded-full bg-muted">
              <BarChart className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">בקשות הצעת מחיר פעילות</p>
              <p className="text-2xl font-bold text-foreground">{stats.activeProposals}</p>
            </div>
            <div className="p-3 rounded-full bg-muted">
              <FileText className="w-6 h-6 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
