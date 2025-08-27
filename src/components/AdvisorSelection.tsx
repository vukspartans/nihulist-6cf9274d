import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Users, Plus } from 'lucide-react';
import { useAdvisorsValidation } from '@/hooks/useAdvisorsValidation';

interface AdvisorSelectionProps {
  projectType: string;
  selectedAdvisors: string[];
  onAdvisorsChange: (advisors: string[]) => void;
  onProjectTypeChange: (projectType: string) => void;
  onValidationChange: (isValid: boolean, validation: any) => void;
}

export const AdvisorSelection = ({
  projectType,
  selectedAdvisors,
  onAdvisorsChange,
  onProjectTypeChange,
  onValidationChange
}: AdvisorSelectionProps) => {
  const {
    data,
    loading,
    error,
    validateAdvisorSelection,
    getCanonicalProjectTypes,
    getRecommendedAdvisors
  } = useAdvisorsValidation();

  const [validation, setValidation] = useState<any>(null);

  useEffect(() => {
    if (data && projectType) {
      const result = validateAdvisorSelection(projectType, selectedAdvisors);
      setValidation(result);
      onValidationChange(result.Status === 'All Advisors Present', result);
    }
  }, [data, projectType, selectedAdvisors, validateAdvisorSelection, onValidationChange]);

  const handleAdvisorToggle = (advisor: string, checked: boolean) => {
    if (checked) {
      onAdvisorsChange([...selectedAdvisors, advisor]);
    } else {
      onAdvisorsChange(selectedAdvisors.filter(a => a !== advisor));
    }
  };

  const handleAddAllMissing = () => {
    if (validation?.Missing) {
      const newAdvisors = [...selectedAdvisors, ...validation.Missing];
      onAdvisorsChange(Array.from(new Set(newAdvisors)));
    }
  };

  const handleAddRecommended = () => {
    const recommended = getRecommendedAdvisors(projectType);
    const newAdvisors = [...selectedAdvisors, ...recommended];
    onAdvisorsChange(Array.from(new Set(newAdvisors)));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>טוען נתוני יועצים...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">שגיאה בטעינת נתונים</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canonicalTypes = getCanonicalProjectTypes();
  const recommendedAdvisors = getRecommendedAdvisors(projectType);

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            בחירת יועצים לפרויקט
          </CardTitle>
          <CardDescription>
            בחר את סוג הפרויקט והיועצים הנדרשים לפני שליחת RFP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">סוג פרויקט</label>
            <Select value={projectType} onValueChange={onProjectTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג פרויקט" />
              </SelectTrigger>
              <SelectContent align="end">
                {canonicalTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Validation Status */}
          {validation && (
            <Alert className={validation.Status === 'All Advisors Present' ? 'border-green-500' : 'border-yellow-500'}>
              <div className="flex items-center gap-2">
                {validation.Status === 'All Advisors Present' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                )}
                <AlertDescription>{validation.Notes}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Statistics */}
          {validation && (
            <div className="flex gap-4 text-sm">
              <Badge variant="outline">
                נבחרו: {validation.SelectedCount} מתוך {validation.RequiredCount}
              </Badge>
              {validation.Missing.length > 0 && (
                <Badge variant="destructive">
                  חסרים: {validation.Missing.length}
                </Badge>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {projectType && (
            <div className="flex gap-2">
              {recommendedAdvisors.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddRecommended}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  הוסף מומלצים לפרויקט
                </Button>
              )}
              {validation?.Missing.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAllMissing}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  הוסף חסרים ({validation.Missing.length})
                </Button>
              )}
            </div>
          )}

          {/* Advisors List */}
          {data && projectType && (
            <div className="space-y-4">
              <h3 className="font-medium">יועצים נדרשים לפרויקט זה</h3>
              <div className="grid gap-3">
                {recommendedAdvisors.length > 0 ? (
                  recommendedAdvisors.map((advisor) => {
                    const isSelected = selectedAdvisors.includes(advisor);
                    const isMissing = validation?.Missing.includes(advisor);
                    
                    return (
                      <div
                        key={advisor}
                        className={`flex items-center space-x-2 space-x-reverse p-3 rounded-lg border ${
                          isMissing ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}
                      >
                        <Checkbox
                          id={advisor}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleAdvisorToggle(advisor, checked as boolean)}
                        />
                        <label
                          htmlFor={advisor}
                          className={`text-sm font-medium cursor-pointer flex-1 ${
                            isMissing ? 'text-red-700' : ''
                          }`}
                        >
                          {advisor}
                        </label>
                        {isMissing && (
                          <Badge variant="destructive" className="text-xs">
                            נדרש
                          </Badge>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    לא נמצאו יועצים ספציפיים לסוג פרויקט זה
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Show message when no project type selected */}
          {!projectType && (
            <div className="text-center py-4 text-muted-foreground">
              בחר סוג פרויקט כדי לראות את היועצים הנדרשים
            </div>
          )}

          {/* Unknown Project Type Error */}
          {validation?.Status === 'Unknown Project Type' && (
            <Alert className="border-red-500">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>סוג פרויקט לא מזוהה. בחר מהרשימה:</p>
                  <div className="flex flex-wrap gap-1">
                    {validation.ValidProjectTypes?.map((type) => (
                      <Badge
                        key={type}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => onProjectTypeChange(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};