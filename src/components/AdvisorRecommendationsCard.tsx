import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAdvisorsByExpertise } from '@/hooks/useAdvisorsByExpertise';
import { AdvisorTable } from '@/components/AdvisorTable';
import { RequestEditorDialog, AdvisorTypeRequestData } from '@/components/RequestEditorDialog';

interface AdvisorRecommendationsCardProps {
  projectId: string;
  projectName: string;
  projectType: string;
  projectLocation?: string;
  selectedAdvisorTypes: string[];
  selectedAdvisors: Record<string, string[]>;
  onSelectAdvisors: (advisors: Record<string, string[]>) => void;
  requestDataByType?: Record<string, AdvisorTypeRequestData>;
  onRequestDataChange?: (advisorType: string, data: AdvisorTypeRequestData) => void;
}

export const AdvisorRecommendationsCard = ({
  projectId,
  projectName,
  projectType,
  projectLocation,
  selectedAdvisorTypes,
  selectedAdvisors,
  onSelectAdvisors,
  requestDataByType = {},
  onRequestDataChange
}: AdvisorRecommendationsCardProps) => {
  const [reviewedTypes, setReviewedTypes] = useState<Record<string, boolean>>({});
  
  const { sortedAdvisorTypes, loading, error } = useAdvisorsByExpertise(
    projectType,
    selectedAdvisorTypes,
    projectLocation
  );

  const handleAdvisorToggle = (advisorId: string, advisorType: string) => {
    const typeSelections = selectedAdvisors[advisorType] || [];
    const isSelected = typeSelections.includes(advisorId);
    
    if (isSelected) {
      onSelectAdvisors({
        ...selectedAdvisors,
        [advisorType]: typeSelections.filter(id => id !== advisorId)
      });
    } else {
      onSelectAdvisors({
        ...selectedAdvisors,
        [advisorType]: [...typeSelections, advisorId]
      });
    }
  };

  const handleRequestSave = (advisorType: string, data: AdvisorTypeRequestData) => {
    onRequestDataChange?.(advisorType, data);
    setReviewedTypes(prev => ({ ...prev, [advisorType]: true }));
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
    const selectedTypes = phaseTypes.filter(t => {
      const typeSelections = selectedAdvisors[t.type] || [];
      return t.advisors.some(a => typeSelections.includes(a.id));
    }).length;
    const totalAdvisors = phaseTypes.reduce((sum, t) => sum + t.advisors.length, 0);
    const selectedAdvisorsCount = phaseTypes.reduce((sum, t) => {
      const typeSelections = selectedAdvisors[t.type] || [];
      return sum + t.advisors.filter(a => typeSelections.includes(a.id)).length;
    }, 0);
    return { totalTypes, selectedTypes, totalAdvisors, selectedAdvisorsCount };
  };

  // Render advisor type card
  const renderAdvisorTypeCard = (typeData: typeof sortedAdvisorTypes[0]) => {
    const typeSelections = selectedAdvisors[typeData.type] || [];
    const selectedInType = typeSelections.length;

    return (
      <Card key={typeData.type} className="border-2">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">{typeData.type}</h3>
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
              <RequestEditorDialog
                advisorType={typeData.type}
                projectName={projectName}
                projectId={projectId}
                recipientCount={selectedInType}
                initialData={requestDataByType[typeData.type]}
                onSave={(data) => handleRequestSave(typeData.type, data)}
                hasBeenReviewed={reviewedTypes[typeData.type] || requestDataByType[typeData.type]?.hasBeenReviewed}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AdvisorTable
            advisors={typeData.advisors}
            selectedAdvisors={typeSelections}
            advisorType={typeData.type}
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
            {Object.values(selectedAdvisors).flat().length} נבחרו
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
            <h3 className="font-bold text-lg text-blue-700">שלב 1 - בחינת הפרויקט</h3>
            {advisorsByPhase[1].map(renderAdvisorTypeCard)}
          </div>
        )}

        {/* Phase 2 Advisors */}
        {advisorsByPhase[2]?.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-orange-700">שלב 2 - תכנון אדריכלי ראשוני</h3>
            {advisorsByPhase[2].map(renderAdvisorTypeCard)}
          </div>
        )}

        {/* Phase 3 Advisors */}
        {advisorsByPhase[3]?.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-yellow-700">שלב 3 - העלאת יועצים</h3>
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
        {Object.values(selectedAdvisors).flat().length > 0 && (
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>סה"כ {Object.values(selectedAdvisors).flat().length} יועצים נבחרו לקבלת הצעת מחיר</span>
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
