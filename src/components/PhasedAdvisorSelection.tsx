import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, AlertCircle, Users, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useAdvisorsValidation } from '@/hooks/useAdvisorsValidation';
import { ADVISOR_PHASES, getAdvisorPhase } from '@/constants/advisorPhases';
import { canonicalizeAdvisor } from '@/lib/canonicalizeAdvisor';

interface PhasedAdvisorSelectionProps {
  projectType: string;
  selectedAdvisors: string[];
  onAdvisorsChange: (advisors: string[]) => void;
  onValidationChange: (isValid: boolean, validation: any) => void;
}

export const PhasedAdvisorSelection = ({
  projectType,
  selectedAdvisors,
  onAdvisorsChange,
  onValidationChange
}: PhasedAdvisorSelectionProps) => {
  const {
    data,
    loading,
    error,
    validateAdvisorSelection,
    getRecommendedAdvisors
  } = useAdvisorsValidation();

  const [validation, setValidation] = useState<any>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [openPhases, setOpenPhases] = useState<Record<number, boolean>>({ 1: true });
  
  // Create canonical set for O(1) lookup
  const canonicalSelected = useMemo(() => 
    new Set(selectedAdvisors.map(canonicalizeAdvisor)), 
    [selectedAdvisors]
  );

  // Unified advisor list: combine required_categories and recommended advisors
  const displayedAdvisors = useMemo(() => {
    if (!data || !projectType) return [];
    return Array.from(new Set([
      ...(data.required_categories || []).map(canonicalizeAdvisor),
      ...getRecommendedAdvisors(projectType).map(canonicalizeAdvisor),
    ]));
  }, [data, projectType]);


  useEffect(() => {
    if (data && projectType) {
      const result = validateAdvisorSelection(projectType, selectedAdvisors);
      setValidation(result);
      
      // Consider valid if at least one advisor is selected
      const isValid = selectedAdvisors.length >= 1;
      
      onValidationChange(isValid, result);
    }
  }, [data, projectType, selectedAdvisors, displayedAdvisors]);

  const handleAdvisorToggle = (advisor: string, checked: boolean) => {
    const canonical = canonicalizeAdvisor(advisor);
    if (checked) {
      onAdvisorsChange([...selectedAdvisors, canonical]);
    } else {
      onAdvisorsChange(selectedAdvisors.filter(a => canonicalizeAdvisor(a) !== canonical));
    }
  };

  const handleSelectPhase = (phaseId: number) => {
    const phaseAdvisors = displayedAdvisors.filter(advisor => 
      getAdvisorPhase(projectType, advisor) === phaseId
    );
    
    // Canonicalize both existing and new advisors before merging
    const mergedCanonical = new Set([
      ...selectedAdvisors.map(canonicalizeAdvisor),
      ...phaseAdvisors.map(canonicalizeAdvisor),
    ]);
    
    onAdvisorsChange(Array.from(mergedCanonical));
  };

  const togglePhase = (phaseId: number) => {
    setOpenPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
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

  // Use the unified displayedAdvisors list
  const recommendedAdvisors = displayedAdvisors;

  // Group advisors by phase
  const advisorsByPhase: Record<number, string[]> = {};
  const advisorsNoPhase: string[] = [];

  recommendedAdvisors.forEach(advisor => {
    const phase = getAdvisorPhase(projectType, advisor);
    if (phase) {
      if (!advisorsByPhase[phase]) {
        advisorsByPhase[phase] = [];
      }
      advisorsByPhase[phase].push(advisor);
    } else {
      advisorsNoPhase.push(advisor);
    }
  });

  // Calculate phase progress
  const getPhaseProgress = (phaseId: number) => {
    const phaseAdvisors = advisorsByPhase[phaseId] || [];
    const selectedCount = phaseAdvisors.filter(a => canonicalSelected.has(canonicalizeAdvisor(a))).length;
    return { total: phaseAdvisors.length, selected: selectedCount };
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            בחירת יועצים לפי שלבים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Type Display */}
          {projectType && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">סוג פרויקט: {projectType}</span>
              </div>
            </div>
          )}

          {/* Phase Sections */}
          {[1, 2, 3].map(phaseId => {
            const phaseInfo = ADVISOR_PHASES[phaseId];
            const phaseAdvisors = advisorsByPhase[phaseId] || [];
            const progress = getPhaseProgress(phaseId);
            const isComplete = progress.selected === progress.total && progress.total > 0;
            const isOpen = openPhases[phaseId] ?? false;

            return (
              <Collapsible key={phaseId} open={isOpen} onOpenChange={() => togglePhase(phaseId)}>
                <Card className={`border-2 ${phaseInfo.borderClass} ${phaseInfo.bgClass}`}>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            {isOpen ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                            <h3 className={`font-bold text-lg ${phaseInfo.textClass}`}>
                              {phaseInfo.name}
                            </h3>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            <span className="font-semibold">{progress.selected}</span>
                            <span className="text-muted-foreground"> / {progress.total}</span>
                          </div>
                          {isComplete && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground text-right mt-1">
                        {phaseInfo.description}
                      </p>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {progress.total === 0 ? (
                        <div className="text-sm text-muted-foreground p-3 rounded-md border border-dashed">
                          אין סוגי יועצים לשלב זה עבור סוג הפרויקט שנבחר.
                        </div>
                      ) : (
                        <>
                          {/* Quick action to select all in phase */}
                          {progress.selected < progress.total && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPhase(phaseId);
                              }}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 ml-2" />
                              בחר את כל היועצים בשלב זה
                            </Button>
                          )}

                          {/* Advisors list */}
                          <div className="grid gap-2">
                            {phaseAdvisors.map((advisor) => {
                          const isSelected = canonicalSelected.has(canonicalizeAdvisor(advisor));
                          
                          return (
                            <div
                              key={advisor}
                              className={`flex items-center space-x-2 space-x-reverse p-3 rounded-lg border transition-colors ${
                                isSelected 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Checkbox
                                id={`${phaseId}-${advisor}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => handleAdvisorToggle(advisor, checked as boolean)}
                              />
                              <label
                                htmlFor={`${phaseId}-${advisor}`}
                                className="text-sm font-medium cursor-pointer flex-1"
                              >
                                {advisor}
                              </label>
                              {isSelected && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          );
                        })}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}

          {/* Optional Advisors (no phase) */}
          {advisorsNoPhase.length > 0 && (
            <Collapsible open={openPhases[0]} onOpenChange={() => togglePhase(0)}>
              <Card className="border-2 border-gray-300 bg-gray-50">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {openPhases[0] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                        <h3 className="font-bold text-lg text-gray-700">
                          יועצים נוספים - אופציונלי
                        </h3>
                        <Badge variant="outline">אופציונלי</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {advisorsNoPhase.filter(a => canonicalSelected.has(canonicalizeAdvisor(a))).length} / {advisorsNoPhase.length}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-right mt-1">
                      יועצים נוספים שניתן להוסיף לפי הצורך
                    </p>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-2">
                      {advisorsNoPhase.map((advisor) => {
                        const isSelected = canonicalSelected.has(canonicalizeAdvisor(advisor));
                        
                        return (
                          <div
                            key={advisor}
                            className={`flex items-center space-x-2 space-x-reverse p-3 rounded-lg border ${
                              isSelected 
                                ? 'border-primary bg-primary/5' 
                                : 'border-gray-200'
                            }`}
                          >
                            <Checkbox
                              id={`optional-${advisor}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => handleAdvisorToggle(advisor, checked as boolean)}
                            />
                            <label
                              htmlFor={`optional-${advisor}`}
                              className="text-sm font-medium cursor-pointer flex-1"
                            >
                              {advisor}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Summary Alert */}
          {selectedAdvisors.length > 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                סה"כ {selectedAdvisors.length} יועצים נבחרו • מוכן להמשך ✓
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                יש לבחור לפחות יועץ אחד כדי להמשיך
              </AlertDescription>
            </Alert>
          )}

          {/* Show message when no project type selected */}
          {!projectType && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                יש לבחור סוג פרויקט בשלב הקודם כדי לראות את היועצים הנדרשים
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
