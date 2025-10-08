import React from 'react';
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


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            יועצים מומלצים לפרויקט
          </div>
          <Badge variant="secondary">
            {selectedAdvisors.length} נבחרו
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          היועצים מוצגים לפי סדר עדיפות - תחילה יועצים קריטיים, ואחר כך מומלצים. 
          בכל קטגוריה, היועצים ממוינים לפי התאמה למיקום הפרויקט, דירוג וניסיון.
        </p>

        {/* Advisor Types - sorted by priority */}
        {sortedAdvisorTypes.map((typeData) => {
          const selectedInType = typeData.advisors.filter(advisor => 
            selectedAdvisors.includes(advisor.id)
          ).length;

          return (
            <Card key={typeData.type} className="border-2">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{typeData.type}</h3>
                    {typeData.priority === 'critical' && (
                      <Badge variant="destructive" className="text-xs">
                        נדרש
                      </Badge>
                    )}
                    {typeData.priority === 'recommended' && (
                      <Badge variant="secondary" className="text-xs">
                        מומלץ
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
                      rfpContent={rfpContent}
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
        })}

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
