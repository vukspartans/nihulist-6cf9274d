import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Users, FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RecommendationsCard } from './RecommendationsCard';
import { AdvisorSelection } from './AdvisorSelection';
import { useRFP } from '@/hooks/useRFP';

interface RFPManagerProps {
  projectId: string;
  projectName: string;
  projectType: string;
}

export const RFPManager = ({ projectId, projectName, projectType }: RFPManagerProps) => {
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedAdvisors, setSelectedAdvisors] = useState<string[]>([]);
  const [currentProjectType, setCurrentProjectType] = useState(projectType);
  const [advisorValidation, setAdvisorValidation] = useState<any>(null);
  const [isAdvisorSelectionValid, setIsAdvisorSelectionValid] = useState(false);
  const [rfpSent, setRfpSent] = useState(false);
  const { sendRFPInvitations, loading } = useRFP();

  const handleSendRFP = async () => {
    if (!isAdvisorSelectionValid) {
      return;
    }
    const result = await sendRFPInvitations(projectId, selectedSuppliers);
    if (result) {
      setRfpSent(true);
    }
  };

  const handleAdvisorValidationChange = (isValid: boolean, validation: any) => {
    setIsAdvisorSelectionValid(isValid);
    setAdvisorValidation(validation);
  };

  if (rfpSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <FileText className="h-5 w-5" />
            הצעות מחיר נשלחו בהצלחה
          </CardTitle>
          <CardDescription>
            הצעות המחיר עבור "{projectName}" נשלחו ל-{selectedSuppliers.length || 'מומלצים'} ספקים.
            תקבל הצעות ברגע שיגיעו.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setRfpSent(false)} 
            variant="outline"
          >
            שלח לספקים נוספים
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Advisor Selection */}
      <AdvisorSelection
        projectType={currentProjectType}
        selectedAdvisors={selectedAdvisors}
        onAdvisorsChange={setSelectedAdvisors}
        onValidationChange={handleAdvisorValidationChange}
      />

      {/* RFP Sending Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            שליחת הצעות מחיר עבור "{projectName}"
          </CardTitle>
          <CardDescription>
            בחר ספקים להזמנה או השתמש בהמלצות AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Advisor validation warning */}
          {!isAdvisorSelectionValid && advisorValidation && (
            <Alert className="border-yellow-500">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                לא ניתן לשלוח הצעות מחיר ללא השלמת בחירת היועצים הנדרשים.
                {advisorValidation.Missing?.length > 0 && (
                  <span> חסרים: {advisorValidation.Missing.join(', ')}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {selectedSuppliers.length} ספקים נבחרו
            </div>
            <Button 
              onClick={handleSendRFP}
              disabled={loading || !isAdvisorSelectionValid}
              className="mr-auto"
            >
              {loading ? 'שולח...' : 'שלח הזמנות הצעות מחיר'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Recommendations */}
      {isAdvisorSelectionValid && (
        <RecommendationsCard
          projectId={projectId}
          onSelectSuppliers={setSelectedSuppliers}
          selectedSuppliers={selectedSuppliers}
        />
      )}
    </div>
  );
};