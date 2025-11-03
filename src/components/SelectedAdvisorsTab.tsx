import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, FileText, Download, Trash2, Phone, Mail, MapPin, Calendar, DollarSign } from 'lucide-react';
import { AddAdvisorDialog } from './AddAdvisorDialog';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface SelectedAdvisor {
  id: string;
  advisor_id: string;
  fee_amount: number;
  fee_currency: string;
  fee_type: string;
  payment_terms: string | null;
  agreement_url: string | null;
  start_date: string | null;
  end_date: string | null;
  scope_of_work: string | null;
  deliverables: string[] | null;
  status: string;
  selected_at: string;
  notes: string | null;
  advisor: {
    company_name: string;
    location: string | null;
    logo_url: string | null;
    office_phone: string | null;
    expertise: string[] | null;
    user: {
      name: string;
      email: string;
      phone: string | null;
    };
  };
}

interface SelectedAdvisorsTabProps {
  projectId: string;
}

export const SelectedAdvisorsTab = ({ projectId }: SelectedAdvisorsTabProps) => {
  const [advisors, setAdvisors] = useState<SelectedAdvisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchAdvisors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_advisors')
        .select(`
          *,
          advisor:advisors!project_advisors_advisor_id_fkey (
            company_name,
            location,
            logo_url,
            office_phone,
            expertise,
            user_id
          )
        `)
        .eq('project_id', projectId)
        .order('selected_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const advisorData = data || [];
      const userIds = advisorData.map((item: any) => item.advisor.user_id).filter(Boolean);
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, email, phone')
          .in('user_id', userIds);

        if (!profilesError && profiles) {
          // Merge profile data with advisor data
          const enrichedData = advisorData.map((item: any) => ({
            ...item,
            advisor: {
              ...item.advisor,
              user: profiles.find((p: any) => p.user_id === item.advisor.user_id) || {
                name: '',
                email: '',
                phone: ''
              }
            }
          }));
          setAdvisors(enrichedData as any);
        } else {
          setAdvisors(advisorData as any);
        }
      } else {
        setAdvisors(advisorData as any);
      }
    } catch (error) {
      console.error('Error fetching advisors:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את היועצים שנבחרו',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisors();
  }, [projectId]);

  const handleRemoveAdvisor = async (advisorId: string) => {
    if (!confirm('האם אתה בטוח שברצונך להסיר יועץ זה מהפרויקט?')) return;

    try {
      const { error } = await supabase
        .from('project_advisors')
        .delete()
        .eq('id', advisorId);

      if (error) throw error;

      toast({
        title: 'היועץ הוסר',
        description: 'היועץ הוסר בהצלחה מהפרויקט',
      });
      fetchAdvisors();
    } catch (error) {
      console.error('Error removing advisor:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להסיר את היועץ',
        variant: 'destructive',
      });
    }
  };

  const getFeeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fixed: 'סכום קבוע',
      percentage: 'אחוז מהתקציב',
      hourly: 'תעריף שעתי',
      milestone: 'לפי אבני דרך',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (advisors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="rounded-full bg-muted p-6 mb-6">
          <Users className="h-16 w-16 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">טרם נבחרו יועצים לפרויקט זה</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          בחר יועצים מתוך ההצעות שהתקבלו או הוסף יועץ חדש למעקב
        </p>
        <div className="flex gap-3">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />
            הוסף יועץ
          </Button>
        </div>
        
        <AddAdvisorDialog
          projectId={projectId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={fetchAdvisors}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">יועצים שנבחרו</h3>
          <p className="text-sm text-muted-foreground">
            {advisors.length} יועצים פעילים בפרויקט
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          הוסף יועץ
        </Button>
      </div>

      <div className="grid gap-4">
        {advisors.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  {item.advisor.logo_url && (
                    <img
                      src={item.advisor.logo_url}
                      alt={item.advisor.company_name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h4 className="font-semibold text-lg mb-1">
                      {item.advisor.company_name}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.advisor.user.name}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">
                        {getFeeTypeLabel(item.fee_type)}
                      </Badge>
                      <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                        {item.status === 'active' ? 'פעיל' : 'הושלם'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveAdvisor(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">שכר טרחה:</span>
                    <span className="font-semibold">
                      {item.fee_amount.toLocaleString('he-IL')} {item.fee_currency}
                    </span>
                  </div>
                  
                  {item.advisor.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{item.advisor.location}</span>
                    </div>
                  )}
                  
                  {item.advisor.office_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${item.advisor.office_phone}`} className="hover:underline">
                        {item.advisor.office_phone}
                      </a>
                    </div>
                  )}
                  
                  {item.advisor.user.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${item.advisor.user.email}`} className="hover:underline">
                        {item.advisor.user.email}
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {item.start_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">תאריך התחלה:</span>
                      <span>{format(new Date(item.start_date), 'dd/MM/yyyy', { locale: he })}</span>
                    </div>
                  )}
                  
                  {item.end_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">תאריך סיום:</span>
                      <span>{format(new Date(item.end_date), 'dd/MM/yyyy', { locale: he })}</span>
                    </div>
                  )}
                  
                  {item.agreement_url && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={item.agreement_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 ml-2" />
                          הסכם
                          <Download className="h-3 w-3 mr-2" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {item.scope_of_work && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="font-semibold text-sm mb-2">היקף עבודה:</h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {item.scope_of_work}
                  </p>
                </div>
              )}

              {item.payment_terms && (
                <div className="mt-4 pt-4 border-t">
                  <h5 className="font-semibold text-sm mb-2">תנאי תשלום:</h5>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {item.payment_terms}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AddAdvisorDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchAdvisors}
      />
    </div>
  );
};
