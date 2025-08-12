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
  activeRfps: number;
  pendingProposals: number;
  totalBudget: number;
  projectsByStatus: Record<string, number>;
  avgProjectValue: number;
  completionRate: number;
}

export const DashboardStats = () => {
  const [stats, setStats] = useState<DashboardStatsData>({
    totalProjects: 0,
    activeRfps: 0,
    pendingProposals: 0,
    totalBudget: 0,
    projectsByStatus: {},
    avgProjectValue: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch projects stats
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .neq('status', 'deleted');

      // Fetch RFPs stats
      const { data: rfps } = await supabase
        .from('rfps')
        .select('id, project_id')
        .eq('sent_by', user.id);

      // Fetch proposals stats
      const { data: proposals } = await supabase
        .from('proposals')
        .select('id, project_id, status')
        .in('project_id', projects?.map(p => p.id) || []);

      if (projects) {
        const projectsByStatus = projects.reduce((acc, project) => {
          acc[project.status] = (acc[project.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
        const completedProjects = projects.filter(p => p.status === 'closed' || p.status === 'selected').length;

        setStats({
          totalProjects: projects.length,
          activeRfps: rfps?.length || 0,
          pendingProposals: proposals?.filter(p => p.status === 'received').length || 0,
          totalBudget,
          projectsByStatus,
          avgProjectValue: projects.length > 0 ? totalBudget / projects.length : 0,
          completionRate: projects.length > 0 ? (completedProjects / projects.length) * 100 : 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: 'סה"כ פרויקטים',
      value: stats.totalProjects,
      icon: BarChart,
      trend: '+12%',
      color: 'text-primary'
    },
    {
      title: 'RFP פעילים',
      value: stats.activeRfps,
      icon: FileText,
      trend: '+5%',
      color: 'text-accent'
    },
    {
      title: 'הצעות ממתינות',
      value: stats.pendingProposals,
      icon: Clock,
      trend: '+8%',
      color: 'text-construction'
    },
    {
      title: 'תקציב כולל',
      value: formatCurrency(stats.totalBudget),
      icon: DollarSign,
      trend: '+15%',
      color: 'text-success'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 ml-1 text-success" />
                    {stat.trend} מהחודש הקודם
                  </p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <CheckCircle className="w-4 h-4 ml-2" />
              שיעור השלמה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.completionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              פרויקטים שהושלמו בהצלחה
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <DollarSign className="w-4 h-4 ml-2" />
              ערך ממוצע לפרויקט
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats.avgProjectValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              תקציב ממוצע לפרויקט
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <AlertCircle className="w-4 h-4 ml-2" />
              פרוייקטים לפי סטטוס
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.projectsByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <Badge variant="outline" className="text-xs">
                    {status}
                  </Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};