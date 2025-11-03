import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
import { CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { FileUpload } from '@/components/FileUpload';
import { ConditionsBuilder } from '@/components/ConditionsBuilder';
import { useProposalSubmit } from '@/hooks/useProposalSubmit';

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
  const { rfp_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [rfpDetails, setRfpDetails] = useState<RFPDetails | null>(null);
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  
  // Form fields
  const [price, setPrice] = useState('');
  const [timelineDays, setTimelineDays] = useState('');
  const [scopeText, setScopeText] = useState('');
  const [conditions, setConditions] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<any[]>([]);
  const [signature, setSignature] = useState<any>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  const { submitProposal, loading: submitting } = useProposalSubmit();

  useEffect(() => {
    if (user && rfp_id) {
      fetchData();
    }
  }, [user, rfp_id]);

  const fetchData = async () => {
    try {
      // Fetch advisor profile
      const { data: advisor } = await supabase
        .from('advisors')
        .select('id, company_name')
        .eq('user_id', user?.id)
        .single();

      if (!advisor) {
        toast({
          title: "שגיאה",
          description: "לא נמצא פרופיל יועץ. אנא השלם את הפרופיל תחילה.",
          variant: "destructive",
        });
        navigate('/advisor-profile');
        return;
      }

      setAdvisorProfile(advisor);

      // Fetch RFP details
      const { data: rfp } = await supabase
        .from('rfp_invites')
        .select(`
          rfp_id,
          rfps (
            id,
            subject,
            body_html,
            projects (*)
          )
        `)
        .eq('rfp_id', rfp_id)
        .eq('advisor_id', advisor.id)
        .single();

      if (!rfp) {
        toast({
          title: "שגיאה",
          description: "לא נמצאה הזמנה להצעת מחיר",
          variant: "destructive",
        });
        navigate('/advisor-dashboard');
        return;
      }

      setRfpDetails(rfp.rfps as any);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת הנתונים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!declarationAccepted) {
      toast({
        title: "נדרשת הצהרה",
        description: "יש לאשר את ההצהרה לפני שליחת ההצעה",
        variant: "destructive",
      });
      return;
    }

    if (!signature) {
      toast({
        title: "נדרשת חתימה",
        description: "יש לחתום על ההצעה לפני השליחה",
        variant: "destructive",
      });
      return;
    }

    if (!price || !timelineDays) {
      toast({
        title: "שדות חסרים",
        description: "נדרש למלא מחיר ולוח זמנים",
        variant: "destructive",
      });
      return;
    }

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

    if (result.success) {
      setSubmitted(true);
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="flex justify-between items-center p-6 border-b">
          <UserHeader />
        </div>
        
        <div className="flex items-center justify-center p-6">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-700">
                הצעה נשלחה בהצלחה!
              </CardTitle>
              <CardDescription>
                הצעת המחיר שלך נשלחה ללקוח ותופיע ברשימת ההצעות שלך
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/advisor-dashboard')} 
                className="w-full"
              >
                חזרה ללוח הבקרה
              </Button>
            </CardContent>
          </Card>
        </div>
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
          חזרה
        </Button>
      </div>
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle>פרטי הפרויקט</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-medium">שם הפרויקט</Label>
                  <p className="text-sm text-muted-foreground">{rfpDetails?.projects.name}</p>
                </div>
                <div>
                  <Label className="font-medium">סוג הפרויקט</Label>
                  <p className="text-sm text-muted-foreground">{rfpDetails?.projects.type}</p>
                </div>
                <div>
                  <Label className="font-medium">מיקום</Label>
                  <p className="text-sm text-muted-foreground">{rfpDetails?.projects.location}</p>
                </div>
                <div>
                  <Label className="font-medium">תקציב</Label>
                  <p className="text-sm text-muted-foreground">₪{rfpDetails?.projects.budget?.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="font-medium">לוח זמנים</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(rfpDetails?.projects.timeline_start || '').toLocaleDateString('he-IL')} - 
                    {new Date(rfpDetails?.projects.timeline_end || '').toLocaleDateString('he-IL')}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">תיאור הפרויקט</Label>
                  <p className="text-sm text-muted-foreground">{rfpDetails?.projects.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Proposal Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>הגשת הצעת מחיר</CardTitle>
                  <CardDescription>
                    מלא את פרטי ההצעה שלך עבור הפרויקט
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Price & Timeline */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">מחיר מוצע (₪) *</Label>
                        <Input
                          id="price"
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="הזן מחיר בשקלים"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timeline">זמן ביצוע (ימים) *</Label>
                        <Input
                          id="timeline"
                          type="number"
                          value={timelineDays}
                          onChange={(e) => setTimelineDays(e.target.value)}
                          placeholder="מספר ימי העבודה"
                          required
                        />
                      </div>
                    </div>

                    {/* Scope */}
                    <div className="space-y-2">
                      <Label htmlFor="scope">היקף העבודה *</Label>
                      <Textarea
                        id="scope"
                        value={scopeText}
                        onChange={(e) => setScopeText(e.target.value)}
                        placeholder="פרט את העבודה שתבוצע, שיטות העבודה והפתרונות המוצעים..."
                        className="min-h-[120px]"
                        required
                      />
                    </div>

                    {/* Conditions */}
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base">תנאים והנחות</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ConditionsBuilder
                          value={conditions}
                          onChange={setConditions}
                        />
                      </CardContent>
                    </Card>

                    {/* File Upload */}
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base">מסמכים מצורפים</CardTitle>
                        <CardDescription>
                          עד 10 קבצים, מקסימום 10 MB לקובץ
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FileUpload
                          onUpload={setFiles}
                          maxFiles={10}
                          maxSize={10 * 1024 * 1024}
                          existingFiles={files}
                        />
                      </CardContent>
                    </Card>

                    {/* Declaration */}
                    <Alert>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="declaration"
                          checked={declarationAccepted}
                          onCheckedChange={(checked) => setDeclarationAccepted(checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="declaration"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            הצהרה *
                          </label>
                          <AlertDescription className="text-sm">
                            אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היועץ/המשרד ולהגיש הצעה מחייבת לפרויקט זה
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>

                    {/* Signature */}
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-base">חתימה דיגיטלית *</CardTitle>
                        <CardDescription>
                          חתום במסך המגע או בעכבר
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SignatureCanvas onSign={setSignature} />
                      </CardContent>
                    </Card>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={submitting || !declarationAccepted || !signature}
                    >
                      {submitting ? 'שולח הצעה...' : 'שלח הצעת מחיר'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmitProposal;