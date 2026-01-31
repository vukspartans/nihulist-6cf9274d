import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  FolderKanban, 
  ListTodo, 
  Plus, 
  ChevronLeft,
  Loader2,
  MapPin,
  Settings
} from "lucide-react";
import { useMunicipalities } from "@/hooks/useMunicipalities";
import { useLicensingPhases } from "@/hooks/useLicensingPhases";
import { useHierarchicalTemplates } from "@/hooks/useHierarchicalTemplates";
import { PROJECT_TYPE_OPTIONS } from "@/constants/project";
import { HierarchicalTaskEditor } from "@/components/admin/HierarchicalTaskEditor";

type ViewMode = 'municipalities' | 'project-types' | 'phases' | 'tasks';

interface NavigationState {
  municipalityId: string | null;
  municipalityName: string | null;
  projectType: string | null;
  phaseId: string | null;
  phaseName: string | null;
}

export default function LicensingManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('municipalities');
  const [navigation, setNavigation] = useState<NavigationState>({
    municipalityId: null,
    municipalityName: null,
    projectType: null,
    phaseId: null,
    phaseName: null,
  });

  const { data: municipalities, isLoading: municipalitiesLoading } = useMunicipalities(false);
  const { data: phases, isLoading: phasesLoading } = useLicensingPhases({
    municipalityId: navigation.municipalityId || undefined,
    projectType: navigation.projectType || undefined,
  });
  const { data: templates, isLoading: templatesLoading } = useHierarchicalTemplates({
    municipalityId: navigation.municipalityId || undefined,
    projectType: navigation.projectType || undefined,
    licensingPhaseId: navigation.phaseId || undefined,
  });

  // Count templates per phase
  const getTemplateCountForPhase = (phaseId: string) => {
    if (!templates) return 0;
    return templates.filter(t => t.licensing_phase_id === phaseId).length;
  };

  // Navigation handlers
  const selectMunicipality = (id: string, name: string) => {
    setNavigation({ ...navigation, municipalityId: id, municipalityName: name });
    setViewMode('project-types');
  };

  const selectProjectType = (type: string) => {
    setNavigation({ ...navigation, projectType: type });
    setViewMode('phases');
  };

  const selectPhase = (id: string, name: string) => {
    setNavigation({ ...navigation, phaseId: id, phaseName: name });
    setViewMode('tasks');
  };

  const goBack = () => {
    if (viewMode === 'tasks') {
      setNavigation({ ...navigation, phaseId: null, phaseName: null });
      setViewMode('phases');
    } else if (viewMode === 'phases') {
      setNavigation({ ...navigation, projectType: null });
      setViewMode('project-types');
    } else if (viewMode === 'project-types') {
      setNavigation({ ...navigation, municipalityId: null, municipalityName: null });
      setViewMode('municipalities');
    }
  };

  // Breadcrumb
  const renderBreadcrumb = () => {
    const parts = [];
    parts.push(
      <span 
        key="root" 
        className={viewMode !== 'municipalities' ? 'cursor-pointer hover:text-primary' : ''}
        onClick={() => viewMode !== 'municipalities' && setViewMode('municipalities')}
      >
        עיריות
      </span>
    );

    if (navigation.municipalityName) {
      parts.push(<ChevronLeft key="sep1" className="w-4 h-4 mx-1 rotate-180" />);
      parts.push(
        <span 
          key="muni" 
          className={viewMode !== 'project-types' ? 'cursor-pointer hover:text-primary' : ''}
          onClick={() => viewMode !== 'project-types' && goBack()}
        >
          {navigation.municipalityName}
        </span>
      );
    }

    if (navigation.projectType) {
      parts.push(<ChevronLeft key="sep2" className="w-4 h-4 mx-1 rotate-180" />);
      parts.push(
        <span 
          key="project" 
          className={viewMode !== 'phases' ? 'cursor-pointer hover:text-primary' : ''}
          onClick={() => viewMode !== 'phases' && goBack()}
        >
          {navigation.projectType}
        </span>
      );
    }

    if (navigation.phaseName) {
      parts.push(<ChevronLeft key="sep3" className="w-4 h-4 mx-1 rotate-180" />);
      parts.push(<span key="phase">{navigation.phaseName}</span>);
    }

    return (
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        {parts}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ניהול רישוי</h1>
            <p className="text-muted-foreground">
              הגדרת שלבי רישוי ותבניות משימות לפי עירייה וסוג פרויקט
            </p>
          </div>
          {viewMode !== 'municipalities' && (
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="w-4 h-4 ml-2" />
              חזרה
            </Button>
          )}
        </div>

        {renderBreadcrumb()}

        {/* Municipalities View */}
        {viewMode === 'municipalities' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {municipalitiesLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : municipalities && municipalities.length > 0 ? (
              <>
                {municipalities.map((muni) => (
                  <Card 
                    key={muni.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => selectMunicipality(muni.id, muni.name)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          <CardTitle className="text-lg">{muni.name}</CardTitle>
                        </div>
                        {muni.has_special_requirements && (
                          <Badge variant="secondary">דרישות מיוחדות</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {muni.region && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {muni.region}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="border-dashed cursor-pointer hover:border-primary transition-colors flex items-center justify-center min-h-[120px]">
                  <CardContent className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Plus className="w-8 h-8" />
                    <span>הוסף עירייה</span>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mb-4" />
                  <p>אין עיריות מוגדרות</p>
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף עירייה ראשונה
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Project Types View */}
        {viewMode === 'project-types' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderKanban className="w-5 h-5" />
                  בחר סוג פרויקט
                </CardTitle>
                <CardDescription>
                  הגדר תבניות משימות עבור {navigation.municipalityName} לפי סוג פרויקט
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={PROJECT_TYPE_OPTIONS[0]?.value} className="w-full">
                  <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent">
                    {PROJECT_TYPE_OPTIONS.slice(0, 10).map((type) => (
                      <TabsTrigger
                        key={type.value}
                        value={type.value}
                        onClick={() => selectProjectType(type.value)}
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        {type.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Phases View */}
        {viewMode === 'phases' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5" />
                  שלבי רישוי
                </CardTitle>
                <CardDescription>
                  {navigation.municipalityName} • {navigation.projectType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {phasesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : phases && phases.length > 0 ? (
                  <div className="space-y-2">
                    {phases.map((phase, index) => (
                      <div
                        key={phase.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => selectPhase(phase.id, phase.name)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{phase.name}</div>
                            {phase.description && (
                              <div className="text-sm text-muted-foreground">{phase.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">
                            {getTemplateCountForPhase(phase.id)} משימות
                          </Badge>
                          {phase.default_duration_days && (
                            <span className="text-sm text-muted-foreground">
                              {phase.default_duration_days} ימים
                            </span>
                          )}
                          <Button variant="ghost" size="icon">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full mt-4">
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף שלב רישוי
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListTodo className="w-12 h-12 mx-auto mb-4" />
                    <p>אין שלבי רישוי מוגדרים לסוג פרויקט זה</p>
                    <Button variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף שלב ראשון
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tasks View - Hierarchical Editor */}
        {viewMode === 'tasks' && navigation.phaseId && (
          <HierarchicalTaskEditor
            municipalityId={navigation.municipalityId!}
            municipalityName={navigation.municipalityName!}
            projectType={navigation.projectType!}
            licensingPhaseId={navigation.phaseId}
            licensingPhaseName={navigation.phaseName!}
          />
        )}
      </div>
    </AdminLayout>
  );
}
