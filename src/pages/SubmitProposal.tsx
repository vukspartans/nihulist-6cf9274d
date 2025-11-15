import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/roleNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { UserHeader } from '@/components/UserHeader';
import { CheckCircle, ArrowLeft, AlertCircle, Edit3, Upload, CalendarIcon } from 'lucide-react';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { FileUpload } from '@/components/FileUpload';
import { ConditionsBuilder } from '@/components/ConditionsBuilder';
import { useProposalSubmit } from '@/hooks/useProposalSubmit';
import { reportableError, formatSupabaseError } from '@/utils/errorReporting';
import { ProposalProgressStepper } from '@/components/ProposalProgressStepper';
import { ConfirmProposalDialog } from '@/components/ConfirmProposalDialog';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

interface RFPDetails {
  id: string;
  subject: string;
  body_html: string;
  projects: {
    id: string;
    name: string;
    type: string;
    location: string;
    budget: number;
    timeline_start: string;
    timeline_end: string;
    description: string;
  };
}

interface AdvisorProfile {
  id: string;
  company_name: string;
}

const SubmitProposal = () => {
  const { rfp_id, invite_id } = useParams();
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [rfpDetails, setRfpDetails] = useState<RFPDetails | null>(null);
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  
  const [price, setPrice] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [completionDate, setCompletionDate] = useState<Date>();
  const [timelineDays, setTimelineDays] = useState('');
  const [scopeText, setScopeText] = useState('');
  const [conditions, setConditions] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<any[]>([]);
  const [signature, setSignature] = useState<any>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Format price with thousand separators
  const formatPrice = (value: string): string => {
    const num = parseFloat(value.replace(/[^\d]/g, ''));
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('he-IL');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    setPrice(rawValue);
    setPriceDisplay(formatPrice(rawValue));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setCompletionDate(date);
    if (date) {
      const days = differenceInDays(date, new Date());
      setTimelineDays(Math.max(1, days).toString());
    } else {
      setTimelineDays('');
    }
  };

  const { submitProposal, loading: submitting } = useProposalSubmit();

  const steps = [
    { id: 1, title: 'פרטי הצעת מחיר', completed: !!(price && timelineDays) },
    { id: 2, title: 'היקף העבודה', completed: scopeText.length >= 100 },
    { id: 3, title: 'תנאים והנחות', completed: !!(conditions.payment_terms || conditions.assumptions) },
    { id: 4, title: 'קבצים מצורפים', completed: files.length > 0 },
    { id: 5, title: 'חתימה דיגיטלית', completed: !!signature },
    { id: 6, title: 'אישור והגשה', completed: declarationAccepted },
  ];

  useEffect(() => {
    if (user && (rfp_id || invite_id)) {
      fetchData();
    }
  }, [user, rfp_id, invite_id]);

  const fetchData = async () => {
    try {
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== authUser.id) {
        setTimeout(fetchData, 500);
        return;
      }

      const { data: advisor, error: advisorError } = await supabase
        .from('advisors')
        .select('id, company_name')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (advisorError || !advisor) {
        toast({
          title: "שגיאה",
          description: advisorError ? formatSupabaseError(advisorError) : "לא נמצא פרופיל יועץ",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      setAdvisorProfile(advisor);

      let inviteDetails = null;

      if (invite_id) {
        const { data: invite, error: inviteError } = await supabase
          .from('rfp_invites')
          .select(`*, rfps!inner (*, projects!inner (*))`)
          .eq('id', invite_id)
          .eq('advisor_id', advisor.id)
          .maybeSingle();

        if (inviteError) {
          console.error('[SubmitProposal] Invite fetch error:', inviteError);
          toast({
            title: "שגיאה",
            description: formatSupabaseError(inviteError),
            variant: "destructive",
          });
          navigate(getDashboardRouteForRole(primaryRole));
          return;
        }
        if (!invite) {
          toast({ title: "שגיאה", description: "לא נמצאה הזמנה תקפה", variant: "destructive" });
          navigate(getDashboardRouteForRole(primaryRole));
          return;
        }
        inviteDetails = invite;
      } else if (rfp_id) {
        const { data: invite, error: inviteError } = await supabase
          .from('rfp_invites')
          .select(`*, rfps!inner (*, projects!inner (*))`)
          .eq('rfp_id', rfp_id)
          .eq('advisor_id', advisor.id)
          .maybeSingle();

        if (inviteError) {
          console.error('[SubmitProposal] Invite fetch error (via rfp_id):', inviteError);
          toast({
            title: "שגיאה",
            description: formatSupabaseError(inviteError),
            variant: "destructive",
          });
          navigate(getDashboardRouteForRole(primaryRole));
          return;
        }
        if (!invite) {
          toast({ title: "שגיאה", description: "לא נמצאה הזמנה תקפה לפרויקט זה", variant: "destructive" });
          navigate(getDashboardRouteForRole(primaryRole));
          return;
        }
        inviteDetails = invite;
      }

      if (['declined', 'expired', 'submitted'].includes(inviteDetails?.status || '')) {
        toast({
          title: "שגיאה",
          description: inviteDetails?.status === 'submitted' ? "כבר הגשת הצעה להזמנה זו" : inviteDetails?.status === 'declined' ? "ההזמנה נדחתה" : "תוקף ההזמנה פג",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      setRfpDetails(inviteDetails.rfps as any);
    } catch (error) {
      toast({ title: "שגיאה", description: "אירעה שגיאה בטעינת הנתונים", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!declarationAccepted) {
      toast({ title: "שגיאה", description: "יש לאשר את ההצהרה לפני הגשת ההצעה", variant: "destructive" });
      return false;
    }
    if (!signature) {
      toast({ title: "שגיאה", description: "חתימה דיגיטלית נדרשת", variant: "destructive" });
      return false;
    }
    if (!price || parseFloat(price) < 1000 || parseFloat(price) > 10000000) {
      toast({ title: "שגיאה", description: "מחיר ההצעה חייב להיות בין ₪1,000 ל-₪10,000,000", variant: "destructive" });
      return false;
    }
    if (!timelineDays || parseInt(timelineDays) < 1 || parseInt(timelineDays) > 1000) {
      toast({ title: "שגיאה", description: "זמן ביצוע חייב להיות בין יום אחד ל-1000 ימים", variant: "destructive" });
      return false;
    }
    if (scopeText.length < 100) {
      toast({ title: "שגיאה", description: "היקף העבודה חייב להכיל לפחות 100 תווים", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowConfirmDialog(true);
  };

  const handleFinalSubmit = async () => {
    setShowConfirmDialog(false);
    const result = await submitProposal({
      rfpId: rfp_id || '',
      projectId: rfpDetails?.projects.id || '',
      advisorId: advisorProfile?.id || '',
      price: parseFloat(price),
      timeline_days: parseInt(timelineDays),
      scope_text: scopeText,
      conditions,
      files,
      signature,
      declaration: "אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היועץ/המשרד ולהגיש הצעה מחייבת לפרויקט זה"
    });
    if (result.success) setSubmitted(true);
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="flex justify-between items-center p-6 border-b"><UserHeader /></div>
        <div className="flex items-center justify-center p-6">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-700">הצעה נשלחה בהצלחה!</CardTitle>
              <CardDescription>הצעת המחיר שלך נשלחה ללקוח ותופיע ברשימת ההצעות שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(getDashboardRouteForRole(primaryRole))} className="w-full">חזרה ללוח הבקרה</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="flex justify-between items-center p-6 border-b"><UserHeader /></div>
      <div className="container max-w-4xl mx-auto px-4 py-8" dir="rtl">
        <Button variant="ghost" onClick={() => navigate(getDashboardRouteForRole(primaryRole))} className="mb-6">
          <ArrowLeft className="ml-2 h-4 w-4" />חזרה לדשבורד
        </Button>
        <ProposalProgressStepper steps={steps} className="mb-8" />
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>פרטי הצעת מחיר</CardTitle>
              <CardDescription>הזינו את המחיר המוצע וזמן הביצוע</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4" dir="rtl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">מחיר ההצעה (₪)</Label>
                  <Input
                    id="price"
                    type="text"
                    value={priceDisplay}
                    onChange={handlePriceChange}
                    placeholder="0"
                    required
                    dir="ltr"
                    className="text-right"
                  />
                  {price && parseFloat(price) >= 1000 && parseFloat(price) <= 10000000 && (
                    <div className="flex items-center gap-2 mt-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>מחיר תקין: ₪{parseFloat(price).toLocaleString('he-IL')}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeline">תאריך סיום משוער</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="timeline"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !completionDate && "text-muted-foreground"
                        )}
                        dir="rtl"
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {completionDate ? (
                          format(completionDate, "PPP", { locale: he })
                        ) : (
                          <span>בחרו תאריך סיום</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" dir="rtl">
                      <Calendar
                        mode="single"
                        selected={completionDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => date < new Date() || date > new Date(Date.now() + 1000 * 24 * 60 * 60 * 1000)}
                        initialFocus
                        locale={he}
                        className="pointer-events-auto"
                        dir="rtl"
                      />
                    </PopoverContent>
                  </Popover>
                  {completionDate && timelineDays && (
                    <div className="flex items-center gap-2 mt-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span>זמן ביצוע: {timelineDays} ימים</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>היקף העבודה</CardTitle><CardDescription>פרטו את היקף העבודה המוצע</CardDescription></CardHeader>
            <CardContent className="space-y-2" dir="rtl">
              <Label htmlFor="scope">תיאור מפורט</Label>
              <Textarea id="scope" value={scopeText} onChange={(e) => setScopeText(e.target.value)} placeholder="פרט את היקף העבודה המוצע (מינימום 100 תווים)" rows={6} required />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>מינימום 100 תווים</span>
                <span className={cn("font-medium", scopeText.length < 100 ? "text-destructive" : "text-green-600")}>{scopeText.length} / 100</span>
              </div>
            </CardContent>
          </Card>
          <ConditionsBuilder value={conditions} onChange={setConditions} />
          <Card className="border-2 border-dashed border-primary/50 hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />קבצים נלווים (אופציונלי)</CardTitle>
              <CardDescription>העלו תוכניות, מפרטים טכניים, או מסמכים רלוונטיים<span className="block mt-1 text-xs">גודל מקסימלי: 10MB לקובץ | עד 10 קבצים</span></CardDescription>
            </CardHeader>
            <CardContent><FileUpload onUpload={setFiles} advisorId={advisorProfile?.id} /></CardContent>
          </Card>
          <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-900 dark:text-orange-200"><strong>שימו לב:</strong> חתימה דיגיטלית זו תהווה התחייבות משפטית מחייבת ותאושר באמצעות חותמת זמן וזיהוי דיגיטלי</AlertDescription>
          </Alert>
          <Card className="border-2 border-primary shadow-lg">
            <CardHeader><CardTitle className="flex items-center gap-2"><Edit3 className="h-5 w-5" />חתימה דיגיטלית</CardTitle><CardDescription>חתמו בתיבה למטה לאישור ההצעה</CardDescription></CardHeader>
            <CardContent><SignatureCanvas onSign={setSignature} /></CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Checkbox id="declaration" checked={declarationAccepted} onCheckedChange={(checked) => setDeclarationAccepted(checked as boolean)} />
                <Label htmlFor="declaration" className="text-sm cursor-pointer">אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היועץ/המשרד ולהגיש הצעה מחייבת לפרויקט זה. ההצעה תקפה למשך 90 יום מהיום.</Label>
              </div>
            </CardContent>
          </Card>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "שולח..." : "המשך לסקירה"}</Button>
        </form>
        <ConfirmProposalDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog} onConfirm={handleFinalSubmit} price={price} timelineDays={timelineDays} scopeText={scopeText} fileCount={files.length} hasSignature={!!signature} />
      </div>
    </div>
  );
};

export default SubmitProposal;
