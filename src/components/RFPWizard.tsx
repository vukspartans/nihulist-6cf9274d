import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  ArrowRight, 
  Send, 
  FileText, 
  Users, 
  Settings,
  CheckCircle,
  Upload,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { PhasedAdvisorSelection } from './PhasedAdvisorSelection';
import { AdvisorRecommendationsCard } from './AdvisorRecommendationsCard';
import { ProjectTypeSelector } from './ProjectTypeSelector';
import { AdvisorTypeRequestData } from './RequestEditorDialog';
import { supabase } from '@/integrations/supabase/client';
import { PROJECT_TYPES } from '@/constants/project';
import { useRFP } from '@/hooks/useRFP';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sanitizeText, sanitizeHtml } from '@/utils/inputSanitization';

interface RFPWizardProps {
  projectId: string;
  projectName: string;
  projectType: string;
  projectLocation?: string;
  onRfpSent?: () => void;
}

interface RFPContent {
  title: string;
  content: string;
  attachments: File[];
}

export const RFPWizard = ({ projectId, projectName, projectType, projectLocation, onRfpSent }: RFPWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProjectType, setSelectedProjectType] = useState(projectType);
  const [selectedAdvisors, setSelectedAdvisors] = useState<string[]>([]);
  const [advisorValidation, setAdvisorValidation] = useState<any>(null);
  const [isAdvisorSelectionValid, setIsAdvisorSelectionValid] = useState(false);
  const [selectedRecommendedAdvisors, setSelectedRecommendedAdvisors] = useState<Record<string, string[]>>({});
  const [requestDataByType, setRequestDataByType] = useState<Record<string, AdvisorTypeRequestData>>({});
  const [rfpContent, setRfpContent] = useState<RFPContent>({
    title: 'בקשה להצעת מחיר {{שם_הפרויקט}}',
    content: `שלום {{שם_המשרד}},

קיבלת אפשרות להגיש הצעת מחיר לפרויקט חדש דרך מערכת ניהוליסט – הפלטפורמה המחברת בין יזמים ליועצים ומנהלת את כל תהליך העבודה במקום אחד.

במערכת תוכלו:
✅ להגיש הצעות מחיר בצורה מסודרת.
✅ לעקוב אחרי סטטוס הפניות וההצעות שלך.
✅ לקבל התראות בזמן אמת על פניות חדשות מפרויקטים רלוונטיים.

כדי לצפות בפרטי הפרויקט ולהגיש הצעת מחיר –
היכנס/י עכשיו למערכת ניהוליסט ›

)אם זו הפעם הראשונה שלך – ההרשמה קצרה ולוקחת פחות מדקה(.

בהצלחה,
צוות ניהוליסט`,
    attachments: []
  });
  const [proposalSent, setProposalSent] = useState(false);
  const { sendRFPInvitations, loading } = useRFP();
  const { toast } = useToast();

  // Load existing RFP from database
  useEffect(() => {
    const loadExistingRfp = async () => {
      const { data, error } = await supabase
        .from('rfps')
        .select('subject, body_html')
        .eq('project_id', projectId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        // Convert HTML to plain text
        const htmlToPlainText = (html: string): string => {
          return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim();
        };

        setRfpContent(prev => ({
          ...prev,
          title: data.subject || prev.title,
          content: data.body_html ? htmlToPlainText(data.body_html) : prev.content
        }));
      }
    };

    loadExistingRfp();
  }, [projectId]);

  const totalSteps = 2;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAdvisorValidationChange = useCallback((isValid: boolean, validation: any) => {
    setIsAdvisorSelectionValid(isValid);
    setAdvisorValidation(validation);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setRfpContent(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const removeAttachment = (index: number) => {
    setRfpContent(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };


  const handleRequestDataChange = (advisorType: string, data: AdvisorTypeRequestData) => {
    setRequestDataByType(prev => ({
      ...prev,
      [advisorType]: data
    }));
  };

  const handleRemoveAdvisorType = (advisorType: string) => {
    // Remove from selected advisor types
    setSelectedAdvisors(prev => prev.filter(t => t !== advisorType));
    
    // Remove selected advisors for this type
    setSelectedRecommendedAdvisors(prev => {
      const { [advisorType]: _, ...rest } = prev;
      return rest;
    });
    
    // Remove request data for this type
    setRequestDataByType(prev => {
      const { [advisorType]: _, ...rest } = prev;
      return rest;
    });
    
    toast({
      title: "סוג יועץ הוסר",
      description: `${advisorType} הוסר מהבקשה`,
    });
  };

  const handleSendRFP = async () => {
    console.log('[RFPWizard] Sending RFP with per-type data:', {
      projectId,
      projectName,
      selectedRecommendedAdvisors,
      requestDataByType
    });

    
    
    // Build advisor-type pairs from recommended advisors
    const advisorTypePairs: Array<{advisor_id: string, advisor_type: string}> = [];
    
    // For each advisor type, send with custom content if available
    for (const [advisorType, advisorIds] of Object.entries(selectedRecommendedAdvisors)) {
      if (advisorIds.length === 0) continue;
      
      advisorIds.forEach(advisorId => {
        advisorTypePairs.push({
          advisor_id: advisorId,
          advisor_type: advisorType
        });
      });
    }

    // Use first type's data or default
    const firstType = Object.keys(selectedRecommendedAdvisors)[0];
    const typeData = requestDataByType[firstType];
    const emailSubject = typeData?.emailSubject || `בקשה להצעת מחיר - ${projectName}`;
    const emailBodyText = typeData?.emailBody || rfpContent.content;
    const loginUrl = `${window.location.origin}/auth?type=advisor&mode=login`;
    
    // Extract request data - sanitize before sending
    const requestTitle = typeData?.requestTitle ? sanitizeText(typeData.requestTitle, 200) : undefined;
    const requestContent = typeData?.requestContent ? sanitizeText(typeData.requestContent, 5000) : undefined;
    const requestFiles = typeData?.requestAttachments;
    
    // SECURITY: Sanitize email content before sending
    const sanitizedEmailBody = emailBodyText
      .split('\n')
      .map(line => {
        const trimmed = sanitizeText(line.trim(), 500);
        if (!trimmed) return '<div style="height: 12px;"></div>';
        
        if (trimmed.includes('היכנס/י עכשיו למערכת ניהוליסט')) {
          return `<p style="margin: 16px 0;"><a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${sanitizeHtml(trimmed)}</a></p>`;
        }
        
        if (trimmed.startsWith('✅')) {
          return `<p style="margin: 8px 0 8px 20px;">${sanitizeHtml(trimmed)}</p>`;
        }
        
        return `<p style="margin: 12px 0;">${sanitizeHtml(trimmed)}</p>`;
      })
      .join('');
    
    // Format email body HTML with sanitized content
    const emailBodyHtml = `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: right; line-height: 1.6;">
  ${sanitizedEmailBody}
</div>
`;
    
    const result = await sendRFPInvitations(
      projectId, 
      advisorTypePairs,
      168,
      emailSubject,
      emailBodyHtml,
      requestTitle,
      requestContent,
      requestFiles
    );
    
    console.log('[RFPWizard] RFP Result:', result);
    
    if (result) {
      setProposalSent(true);
      onRfpSent?.();
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return isAdvisorSelectionValid;
      case 2:
        return Object.values(selectedRecommendedAdvisors).some(ids => ids.length > 0);
      default:
        return true;
    }
  };

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1:
        return 'בחירת יועצים';
      case 2:
        return 'בחירת יועצים מומלצים';
      default:
        return '';
    }
  };

  if (proposalSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            בקשת הצעת מחיר נשלחה בהצלחה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            בקשת הצעת המחיר עבור "{projectName}" נשלחה ל-{Object.values(selectedRecommendedAdvisors).flat().length} יועצים.
            תקבל הצעות ברגע שיגיעו.
          </p>
          <Button 
            onClick={() => {
              setProposalSent(false);
              setCurrentStep(1);
            }} 
            variant="outline"
          >
            שלח ליועצים נוספים
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Missing Project Type Warning */}
      {!selectedProjectType && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">חסר סוג פרויקט</p>
              <p className="text-sm">יש להגדיר סוג פרויקט לפני שליחת בקשה להצעות מחיר. אנא ערוך את הפרויקט והוסף סוג פרויקט.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>שליחת בקשה להצעות</CardTitle>
            <Badge variant="outline">
              שלב {currentStep} מתוך {totalSteps}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{getStepTitle(currentStep)}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">בחירת יועצים</h3>
                <p className="text-muted-foreground">
                  בחר את היועצים לפי סדר עדיפות - התחל משלב 1 (חובה), המשך לשלב 2 ו-3 לפי הצורך
                </p>
              </div>

              <PhasedAdvisorSelection
                projectType={selectedProjectType}
                selectedAdvisors={selectedAdvisors}
                onAdvisorsChange={setSelectedAdvisors}
                onValidationChange={handleAdvisorValidationChange}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">בחירת יועצים מומלצים</h3>
                <p className="text-muted-foreground">
                  בהתבסס על ניתוח הפרויקט שלך, אנו מציגים יועצים מומלצים לכל סוג שבחרת.
                  בחר את היועצים שברצונך לשלוח אליהם בקשה.
                </p>
              </div>

              <AdvisorRecommendationsCard
                projectId={projectId}
                projectName={projectName}
                projectType={selectedProjectType}
                projectLocation={projectLocation}
                selectedAdvisorTypes={selectedAdvisors}
                selectedAdvisors={selectedRecommendedAdvisors}
                onSelectAdvisors={setSelectedRecommendedAdvisors}
                requestDataByType={requestDataByType}
                onRequestDataChange={handleRequestDataChange}
                onRemoveAdvisorType={handleRemoveAdvisorType}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              הקודם
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceedFromStep(currentStep) || !selectedProjectType}
                className="flex items-center gap-2"
              >
                הבא
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSendRFP}
                disabled={loading || !canProceedFromStep(currentStep) || !selectedProjectType}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {loading ? 'שולח...' : 'שלח הצעות מחיר'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};