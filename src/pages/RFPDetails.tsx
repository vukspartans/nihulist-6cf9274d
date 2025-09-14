import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserHeader } from '@/components/UserHeader';
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, FileText } from 'lucide-react';

interface RFPDetails {
  id: string;
  subject: string;
  body_html: string;
  sent_at: string;
  projects: {
    id: string;
    name: string;
    type: string;
    location: string;
    budget: number;
    timeline_start: string;
    timeline_end: string;
    description: string;
    phase: string;
  };
}

interface RFPInvite {
  id: string;
  status: string;
  created_at: string;
}

const RFPDetails = () => {
  const { rfp_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [rfpDetails, setRfpDetails] = useState<RFPDetails | null>(null);
  const [inviteDetails, setInviteDetails] = useState<RFPInvite | null>(null);
  const [advisorId, setAdvisorId] = useState<string | null>(null);

  useEffect(() => {
    if (user && rfp_id) {
      fetchRFPDetails();
    }
  }, [user, rfp_id]);

  const fetchRFPDetails = async () => {
    try {
      // Get advisor profile first
      const { data: advisor } = await supabase
        .from('advisors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!advisor) {
        toast({
          title: "שגיאה",
          description: "לא נמצא פרופיל יועץ",
          variant: "destructive",
        });
        navigate('/advisor-profile');
        return;
      }

      setAdvisorId(advisor.id);

      // Fetch RFP details with invite info
      const { data: invite } = await supabase
        .from('rfp_invites')
        .select(`
          id,
          status,
          created_at,
          rfps (
            id,
            subject,
            body_html,
            sent_at,
            projects (*)
          )
        `)
        .eq('rfp_id', rfp_id)
        .eq('advisor_id', advisor.id)
        .single();

      if (!invite) {
        toast({
          title: "שגיאה",
          description: "לא נמצאה הזמנה להצעת מחיר",
          variant: "destructive",
        });
        navigate('/advisor-dashboard');
        return;
      }

      setRfpDetails(invite.rfps);
      setInviteDetails({
        id: invite.id,
        status: invite.status,
        created_at: invite.created_at
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת פרטי ההזמנה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'ממתין לתגובה';
      case 'responded': return 'נענה';
      case 'accepted': return 'התקבל';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  if (!rfpDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>הזמנה לא נמצאה</CardTitle>
            <CardDescription>לא נמצאה הזמנה להצעת מחיר</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/advisor-dashboard')}>
              חזרה ללוח הבקרה
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="flex justify-between items-center p-6 border-b">
        <UserHeader />
        <Button 
          variant="ghost" 
          onClick={() => navigate('/advisor-dashboard')}
        >
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה ללוח הבקרה
        </Button>
      </div>
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{rfpDetails.projects.name}</h1>
              <p className="text-muted-foreground mt-1">{rfpDetails.subject}</p>
            </div>
            <Badge className={getStatusColor(inviteDetails?.status || '')}>
              {getStatusText(inviteDetails?.status || '')}
            </Badge>
          </div>

          {/* Project Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                פרטי הפרויקט
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">מיקום</p>
                    <p className="text-sm text-muted-foreground">{rfpDetails.projects.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">תקציב</p>
                    <p className="text-sm text-muted-foreground">₪{rfpDetails.projects.budget?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">תאריך התחלה</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(rfpDetails.projects.timeline_start).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">תאריך סיום</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(rfpDetails.projects.timeline_end).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>תיאור הפרויקט</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="font-medium">סוג הפרויקט</Label>
                    <p className="text-sm text-muted-foreground mt-1">{rfpDetails.projects.type}</p>
                  </div>
                  <div>
                    <Label className="font-medium">שלב הפרויקט</Label>
                    <p className="text-sm text-muted-foreground mt-1">{rfpDetails.projects.phase}</p>
                  </div>
                  <div>
                    <Label className="font-medium">תיאור מפורט</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {rfpDetails.projects.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>פרטי ההזמנה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="font-medium">תאריך קבלת ההזמנה</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(inviteDetails?.created_at || '').toLocaleDateString('he-IL')} ב-
                      {new Date(inviteDetails?.created_at || '').toLocaleTimeString('he-IL')}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">סטטוס</Label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(inviteDetails?.status || '')}>
                        {getStatusText(inviteDetails?.status || '')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="font-medium">תאריך שליחת ההזמנה</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(rfpDetails.sent_at).toLocaleDateString('he-IL')} ב-
                      {new Date(rfpDetails.sent_at).toLocaleTimeString('he-IL')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            {inviteDetails?.status === 'pending' && (
              <Button 
                onClick={() => navigate(`/submit-proposal/${rfp_id}`)}
                size="lg"
              >
                הגשת הצעת מחיר
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate('/advisor-dashboard')}
              size="lg"
            >
              חזרה ללוח הבקרה
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RFPDetails;