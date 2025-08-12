import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  FileText, 
  Send, 
  Eye,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ActivityItem {
  id: string;
  action: string;
  actor_type: string;
  created_at: string;
  meta: any;
  project_id?: string;
}

const activityIcons = {
  'project_created': FileText,
  'rfp_sent': Send,
  'proposal_received': Eye,
  'project_updated': FileText,
  'supplier_selected': CheckCircle,
  'default': AlertTriangle
};

const activityLabels = {
  'project_created': 'פרויקט נוצר',
  'rfp_sent': 'RFP נשלח',
  'proposal_received': 'הצעה התקבלה',
  'project_updated': 'פרויקט עודכן',
  'supplier_selected': 'ספק נבחר',
  'default': 'פעילות'
};

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .or(`actor_id.eq.${user.id},project_id.in.(select id from projects where owner_id = ${user.id})`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `לפני ${diffInMinutes} דקות`;
    } else if (diffInHours < 24) {
      return `לפני ${diffInHours} שעות`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `לפני ${diffInDays} ימים`;
    }
  };

  const getActivityIcon = (action: string) => {
    return activityIcons[action as keyof typeof activityIcons] || activityIcons.default;
  };

  const getActivityLabel = (action: string) => {
    return activityLabels[action as keyof typeof activityLabels] || activityLabels.default;
  };

  const getActivityDescription = (activity: ActivityItem) => {
    const meta = activity.meta || {};
    switch (activity.action) {
      case 'project_created':
        return `פרויקט "${meta.project_name}" נוצר`;
      case 'rfp_sent':
        return `RFP נשלח ל-${meta.invites_sent || 0} ספקים`;
      case 'proposal_received':
        return `הצעה התקבלה מ-${meta.supplier_name}`;
      case 'project_updated':
        return `פרויקט "${meta.project_name}" עודכן`;
      case 'supplier_selected':
        return `ספק "${meta.supplier_name}" נבחר`;
      default:
        return 'פעילות במערכת';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 ml-2" />
            פעילות אחרונה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="w-5 h-5 ml-2" />
          פעילות אחרונה
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">אין פעילות אחרונה</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.action);
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">
                        {getActivityLabel(activity.action)}
                      </p>
                      <time className="text-xs text-muted-foreground">
                        {formatTime(activity.created_at)}
                      </time>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getActivityDescription(activity)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};