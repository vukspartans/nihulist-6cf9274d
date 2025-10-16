import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdvisorsByExpertise } from '@/hooks/useAdvisorsByExpertise';
import { AdvisorTable } from '@/components/AdvisorTable';
import { EmailPreviewDialog } from '@/components/EmailPreviewDialog';

interface AdvisorRecommendationsCardProps {
  projectId: string;
  projectName: string;
  projectType: string;
  projectLocation?: string;
  selectedAdvisorTypes: string[];
  selectedAdvisors: string[];
  onSelectAdvisors: (advisors: string[]) => void;
  rfpContent?: {
    title: string;
    content: string;
    attachments?: File[];
  };
}

export const AdvisorRecommendationsCard = ({
  projectId,
  projectName,
  projectType,
  projectLocation,
  selectedAdvisorTypes,
  selectedAdvisors,
  onSelectAdvisors,
  rfpContent
}: AdvisorRecommendationsCardProps) => {
  const [emailContentByType, setEmailContentByType] = useState<Record<string, { title: string; content: string }>>({});
  
  const { sortedAdvisorTypes, loading, error } = useAdvisorsByExpertise(
    projectType,
    selectedAdvisorTypes,
    projectLocation
  );

  const handleAdvisorToggle = (advisorId: string) => {
    const isSelected = selectedAdvisors.includes(advisorId);
    if (isSelected) {
      onSelectAdvisors(selectedAdvisors.filter(id => id !== advisorId));
    } else {
      onSelectAdvisors([...selectedAdvisors, advisorId]);
    }
  };

  const handleEmailSave = (advisorType: string, title: string, content: string) => {
    setEmailContentByType(prev => ({
      ...prev,
      [advisorType]: { title, content }
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            טוען יועצים מומלצים...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>מחפש יועצים במערכת...</p>
            <p>ממיין לפי התאמה לפרויקט...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">שגיאה בטעינת יועצים</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Group advisor types by phase
  const advisorsByPhase: Record<number, typeof sortedAdvisorTypes> = {};
  const advisorsNoPhase: typeof sortedAdvisorTypes = [];

  sortedAdvisorTypes.forEach(typeData => {
    if (typeData.phase) {
      if (!advisorsByPhase[typeData.phase]) {
        advisorsByPhase[typeData.phase] = [];
      }
      advisorsByPhase[typeData.phase].push(typeData);
    } else {
      advisorsNoPhase.push(typeData);
    }
  });

  // Calculate phase summary
  const getPhaseSummary = (phaseId: number) => {
    const phaseTypes = advisorsByPhase[phaseId] || [];
    const totalTypes = phaseTypes.length;
    const selectedTypes = phaseTypes.filter(t => 
      t.advisors.some(a => selectedAdvisors.includes(a.id))
    ).length;
    const totalAdvisors = phaseTypes.reduce((sum, t) => sum + t.advisors.length, 0);
    const selectedAdvisorsCount = phaseTypes.reduce((sum, t) => 
      sum + t.advisors.filter(a => selectedAdvisors.includes(a.id)).length, 0
    );
    return { totalTypes, selectedTypes, totalAdvisors, selectedAdvisorsCount };
  };

  // Render advisor type card
  const renderAdvisorTypeCard = (typeData: typeof sortedAdvisorTypes[0]) => {
    const selectedInType = typeData.advisors.filter(advisor => 
      selectedAdvisors.includes(advisor.id)
    ).length;

    return (
      <Card key={typeData.type} className="border-2">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">{typeData.type}</h3>
              {typeData.phaseInfo && (
                <Badge variant={typeData.phaseInfo.badgeVariant} className="text-xs">
                  {typeData.phaseInfo.priority === 'must-have' && 'חובה'}
                  {typeData.phaseInfo.priority === 'important' && 'חשוב'}
                  {typeData.phaseInfo.priority === 'recommended' && 'מומלץ'}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {typeData.advisors.length} יועצים זמינים
              </Badge>
              {selectedInType > 0 && (
                <Badge variant="default">
                  {selectedInType} נבחרו
                </Badge>
              )}
              <EmailPreviewDialog
                advisorType={typeData.type}
                projectName={projectName}
                projectType={projectType}
                recipientCount={selectedInType}
                rfpContent={emailContentByType[typeData.type] || rfpContent}
                onSave={(title, content) => handleEmailSave(typeData.type, title, content)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdvisorTable
            advisors={typeData.advisors}
            selectedAdvisors={selectedAdvisors}
            onToggleAdvisor={handleAdvisorToggle}
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            יועצים מומלצים לפרויקט - לפי שלבים
          </div>
          <Badge variant="secondary">
            {selectedAdvisors.length} נבחרו
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phase Progress Summary */}
        {[1, 2, 3].some(p => advisorsByPhase[p]?.length > 0) && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm mb-3">התקדמות לפי שלבים:</h4>
            {[1, 2, 3].map(phaseId => {
              const phaseTypes = advisorsByPhase[phaseId];
              if (!phaseTypes || phaseTypes.length === 0) return null;
              
              const summary = getPhaseSummary(phaseId);
              const phaseInfo = phaseTypes[0]?.phaseInfo;
              
              return (
                <div key={phaseId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={phaseInfo?.badgeVariant || 'outline'} className="text-xs">
                      שלב {phaseId}
                    </Badge>
                    <span className={phaseInfo?.textClass}>{phaseInfo?.name}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {summary.selectedTypes}/{summary.totalTypes} סוגים, {summary.selectedAdvisorsCount}/{summary.totalAdvisors} יועצים
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Phase 1 Advisors */}
        {advisorsByPhase[1]?.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-blue-700">שלב 1 - בחינת הפרויקט (חובה)</h3>
              <Badge variant="destructive">קריטי</Badge>
            </div>
            {advisorsByPhase[1].map(renderAdvisorTypeCard)}
          </div>
        )}

        {/* Phase 2 Advisors */}
        {advisorsByPhase[2]?.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-orange-700">שלב 2 - תכנון אדריכלי ראשוני (חשוב)</h3>
              <Badge variant="default">חשוב</Badge>
            </div>
            {advisorsByPhase[2].map(renderAdvisorTypeCard)}
          </div>
        )}

        {/* Phase 3 Advisors */}
        {advisorsByPhase[3]?.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-yellow-700">שלב 3 - העלאת יועצים (מומלץ)</h3>
              <Badge variant="secondary">מומלץ</Badge>
            </div>
            {advisorsByPhase[3].map(renderAdvisorTypeCard)}
          </div>
        )}

        {/* Optional Advisors (no phase) */}
        {advisorsNoPhase.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-gray-700">יועצים נוספים (אופציונלי)</h3>
              <Badge variant="outline">אופציונלי</Badge>
            </div>
            {advisorsNoPhase.map(renderAdvisorTypeCard)}
          </div>
        )}

        {/* Summary */}
        {selectedAdvisors.length > 0 && (
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>סה"כ {selectedAdvisors.length} יועצים נבחרו לקבלת הצעת מחיר</span>
              <Badge variant="default" className="text-sm">
                מוכן לשליחה
              </Badge>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
