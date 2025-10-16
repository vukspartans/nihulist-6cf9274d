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
  Upload
} from 'lucide-react';
import { PhasedAdvisorSelection } from './PhasedAdvisorSelection';
import { AdvisorRecommendationsCard } from './AdvisorRecommendationsCard';
import { ProjectTypeSelector } from './ProjectTypeSelector';
import { supabase } from '@/integrations/supabase/client';
import { PROJECT_TYPES } from '@/constants/project';
import { useRFP } from '@/hooks/useRFP';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  const totalSteps = 4;

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

  // Save project type to database when changed
  const handleProjectTypeChange = async (newType: string) => {
    setSelectedProjectType(newType);
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ type: newType })
        .eq('id', projectId);
      
      if (error) {
        console.error('Error updating project type:', error);
      }
    } catch (error) {
      console.error('Error saving project type:', error);
    }
  };

  const handleSendRFP = async () => {
    // Flatten the Record structure to array of advisor IDs
    const allAdvisorIds = Object.values(selectedRecommendedAdvisors).flat();
    
    // Prepare email content with RTL support, proper spacing, and clickable links
    const loginUrl = `${window.location.origin}/auth`;
    const emailBodyHtml = `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: right; line-height: 1.6;">
  ${rfpContent.content
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<div style="height: 12px;"></div>';
      
      // Convert login link line to clickable link
      if (trimmed.includes('היכנס/י עכשיו למערכת ניהוליסט')) {
        return `<p style="margin: 16px 0;"><a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${trimmed}</a></p>`;
      }
      
      // Add indentation for list items starting with ✅
      if (trimmed.startsWith('✅')) {
        return `<p style="margin: 8px 0 8px 20px;">${trimmed}</p>`;
      }
      
      return `<p style="margin: 12px 0;">${trimmed}</p>`;
    })
    .join('')}
</div>
`;
    
    const result = await sendRFPInvitations(
      projectId, 
      allAdvisorIds,
      rfpContent.title,
      emailBodyHtml
    );
    
    if (result) {
      setProposalSent(true);
      onRfpSent?.();
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!selectedProjectType;
      case 2:
        return isAdvisorSelectionValid;
      case 3:
        return Object.values(selectedRecommendedAdvisors).some(ids => ids.length > 0);
      case 4:
        return !!rfpContent.title && !!rfpContent.content;
      default:
        return true;
    }
  };

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1:
        return 'בחירת סוג פרויקט';
      case 2:
        return 'בחירת יועצים';
      case 3:
        return 'בחירת יועצים מומלצים';
      case 4:
        return 'עריכת תוכן הצעת מחיר';
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
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>שליחת בקשה להצעות מחיר</CardTitle>
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
                <Settings className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">בחירת סוג פרויקט</h3>
                <p className="text-muted-foreground">
                  {selectedProjectType ? 'סוג הפרויקט הנוכחי או בחר סוג אחר' : 'בחר את סוג הפרויקט'}
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <ProjectTypeSelector
                  selectedType={selectedProjectType}
                  onTypeChange={handleProjectTypeChange}
                  label="סוג פרויקט"
                  placeholder="בחר סוג פרויקט"
                />
                {selectedProjectType && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    סוג פרויקט נבחר: {selectedProjectType}
                  </p>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">בחירת יועצים לפי שלבים</h3>
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

          {currentStep === 3 && (
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
                rfpContent={rfpContent}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">עריכת תוכן הצעת המחיר</h3>
                <p className="text-muted-foreground">
                  ערוך את תוכן הבקשה שתישלח ליועצים הנבחרים
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="rfp-title">כותרת</Label>
                  <Input
                    id="rfp-title"
                    value={rfpContent.title}
                    onChange={(e) => setRfpContent(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="rfp-content">תוכן הבקשה</Label>
                  <Textarea
                    id="rfp-content"
                    rows={8}
                    value={rfpContent.content}
                    onChange={(e) => setRfpContent(prev => ({ ...prev, content: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="rfp-files">קבצים מצורפים (אופציונלי)</Label>
                  <div className="mt-1">
                    <input
                      type="file"
                      id="rfp-files"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('rfp-files')?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 ml-2" />
                      העלה קבצים
                    </Button>
                  </div>
                  
                  {rfpContent.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {rfpContent.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                          >
                            הסר
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                disabled={!canProceedFromStep(currentStep)}
                className="flex items-center gap-2"
              >
                הבא
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSendRFP}
                disabled={loading || !canProceedFromStep(currentStep)}
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