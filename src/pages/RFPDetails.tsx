import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/roleNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserHeader } from '@/components/UserHeader';
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, FileText, Send, X } from 'lucide-react';
import { DeadlineCountdown } from '@/components/DeadlineCountdown';
import { DeclineRFPDialog } from '@/components/DeclineRFPDialog';
import { useDeclineRFP } from '@/hooks/useDeclineRFP';

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
  deadline_at?: string;
  request_title?: string;
  request_content?: string;
  request_files?: Array<{
    name: string;
    url: string;
    size: number;
    path: string;
  }>;
}

const RFPDetails = () => {
  const { rfp_id } = useParams();
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [rfpDetails, setRfpDetails] = useState<RFPDetails | null>(null);
  const [inviteDetails, setInviteDetails] = useState<RFPInvite | null>(null);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);

  const { declineRFP, loading: declining } = useDeclineRFP();

  useEffect(() => {
    if (user && rfp_id) {
      fetchRFPDetails();
      markAsOpened();
    }
  }, [user, rfp_id]);

  const markAsOpened = async () => {
    if (!rfp_id || !user) return;

    try {
      const { data: advisor } = await supabase
        .from('advisors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!advisor) return;

      await supabase
        .from('rfp_invites')
        .update({ 
          status: 'opened',
          opened_at: new Date().toISOString(),
        })
        .eq('rfp_id', rfp_id)
        .eq('advisor_id', advisor.id)
        .eq('status', 'sent');
    } catch (error) {
      console.error('Error marking RFP as opened:', error);
    }
  };

  const fetchRFPDetails = async () => {
    try {
      // Step 1: Verify user is authenticated
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast({
          title: "שגיאה",
          description: "לא נמצא משתמש מחובר",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      // Step 2: Wait for valid session to ensure auth.uid() is set for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== authUser.id) {
        console.warn('[RFPDetails] Session mismatch, retrying...', {
          userId: authUser.id,
          sessionUserId: session?.user?.id || 'null',
        });
        // Retry after a short delay
        setTimeout(fetchRFPDetails, 500);
        return;
      }

      console.log('[RFPDetails] Session verified:', {
        userId: authUser.id,
        sessionUserId: session.user.id,
        rfpId: rfp_id,
      });

      // Step 3: Get advisor profile
      const { data: advisor, error: advisorError } = await supabase
        .from('advisors')
        .select('id')
        .eq('user_id', authUser.id)
        .single();

      if (advisorError || !advisor) {
        console.error('[RFPDetails] Advisor fetch error:', advisorError);
        toast({
          title: "שגיאה",
          description: "לא נמצא פרופיל יועץ",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      setAdvisorId(advisor.id);

      // Step 4: Fetch RFP details with invite info
      const { data: invite, error: inviteError } = await supabase
        .from('rfp_invites')
        .select(`
          id,
          status,
          created_at,
          deadline_at,
          request_title,
          request_content,
          request_files,
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
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (inviteError) {
        console.error('[RFPDetails] Invite fetch error:', inviteError);
        toast({
          title: "שגיאה",
          description: "לא נמצאה הזמנה להצעת מחיר. ייתכן שאין לך הרשאות לצפות בפרטי בקשה זו.",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      if (!invite) {
        console.warn('[RFPDetails] No invite found (null result)');
        toast({
          title: "שגיאה",
          description: "לא נמצאה הזמנה להצעת מחיר",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      setRfpDetails(invite.rfps as any);
      setInviteDetails({
        id: invite.id,
        status: invite.status,
        created_at: invite.created_at,
        deadline_at: invite.deadline_at,
        request_title: invite.request_title,
        request_content: invite.request_content,
        request_files: invite.request_files as any
      });
    } catch (error) {
      console.error('[RFPDetails] Unexpected error:', error);
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
      case 'sent': return 'נשלח';
      case 'opened': return 'נפתח';
      case 'in_progress': return 'בעבודה';
      case 'submitted': return 'הוגש';
      case 'declined': return 'נדחה';
      case 'expired': return 'פג תוקף';
      default: return status;
    }
  };

  const handleDecline = async (
    reason: 'no_capacity' | 'outside_expertise' | 'timeline_conflict' | 'budget_mismatch' | 'other', 
    note?: string
  ) => {
    if (!inviteDetails?.id) return;
    
    const result = await declineRFP(inviteDetails.id, reason, note);
    if (result.success) {
      navigate(getDashboardRouteForRole(primaryRole));
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
            <Button onClick={() => navigate(getDashboardRouteForRole(primaryRole))}>
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
          onClick={() => navigate(getDashboardRouteForRole(primaryRole))}
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

          {/* Deadline Countdown */}
          {inviteDetails?.deadline_at && ['sent', 'opened', 'in_progress'].includes(inviteDetails.status) && (
            <DeadlineCountdown deadline={inviteDetails.deadline_at} />
          )}

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

          {/* Request Content from Entrepreneur */}
          {(inviteDetails?.request_title || inviteDetails?.request_content || inviteDetails?.request_files) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  תוכן הבקשה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {inviteDetails.request_title && (
                    <div>
                      <Label className="font-medium">כותרת הבקשה</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {inviteDetails.request_title}
                      </p>
                    </div>
                  )}
                  {inviteDetails.request_content && (
                    <div>
                      <Label className="font-medium">תיאור הבקשה</Label>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {inviteDetails.request_content}
                      </p>
                    </div>
                  )}
                  {inviteDetails.request_files && inviteDetails.request_files.length > 0 && (
                    <div>
                      <Label className="font-medium">קבצים מצורפים</Label>
                      <div className="mt-2 space-y-2">
                        {inviteDetails.request_files.map((file, idx) => (
                          <a 
                            key={idx}
                            href={file.url} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary hover:underline p-3 bg-muted rounded-lg"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="flex-1">{file.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {(file.size / 1024).toFixed(1)} KB
                            </Badge>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
            {['sent', 'opened', 'pending'].includes(inviteDetails?.status || '') && (
              <>
                <Button 
                  onClick={() => navigate(`/submit-proposal/${rfp_id}`)}
                  size="lg"
                >
                  <Send className="w-4 h-4 ml-2" />
                  הגש הצעת מחיר
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setDeclineDialogOpen(true)}
                  size="lg"
                >
                  <X className="w-4 h-4 ml-2" />
                  דחה בקשה
                </Button>
              </>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate(getDashboardRouteForRole(primaryRole))}
              size="lg"
            >
              חזרה ללוח הבקרה
            </Button>
          </div>

          <DeclineRFPDialog
            open={declineDialogOpen}
            onOpenChange={setDeclineDialogOpen}
            onDecline={handleDecline}
            loading={declining}
          />
        </div>
      </div>
    </div>
  );
};

export default RFPDetails;