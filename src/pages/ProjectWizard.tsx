import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Upload, FileText, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdvisorsValidation } from "@/hooks/useAdvisorsValidation";

interface ProjectData {
  name: string;
  type: string;
  location: string;
  status: string;
  budget: string;
  advisorBudget: string;
  description: string;
}

interface FileWithMetadata {
  file: File;
  customName: string;
  description: string;
}

const ProjectWizard = () => {
  const { getCanonicalProjectTypes, loading: advisorsLoading } = useAdvisorsValidation();
  const [currentStep, setCurrentStep] = useState(1);
  const [projectData, setProjectData] = useState<ProjectData>({
    name: "",
    type: "",
    location: "",
    status: "",
    budget: "",
    advisorBudget: "",
    description: ""
  });
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  // Project types from canonical source
  const projectTypes = getCanonicalProjectTypes();

  // Project statuses
  const projectStatuses = [
    "תכנון ראשוני",
    "בתכנון מפורט", 
    "בהיתרים",
    "מוכן לביצוע",
    "בביצוע",
    "בגמר"
  ];

  // Format number with commas and ₪ symbol
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return new Intl.NumberFormat('he-IL').format(parseInt(numericValue));
  };

  const handleBudgetChange = (field: 'budget' | 'advisorBudget', value: string) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: keyof ProjectData, value: string) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const isValidType = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isValidType) {
        toast({
          title: "סוג קובץ לא נתמך",
          description: `הקובץ ${file.name} אינו נתמך. רק PDF ו-Word מותרים.`,
          variant: "destructive",
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "קובץ גדול מדי",
          description: `הקובץ ${file.name} גדול מ-10MB.`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    const newFilesWithMetadata = validFiles.map(file => ({
      file,
      customName: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for default name
      description: ""
    }));

    setFiles(prev => [...prev, ...newFilesWithMetadata].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(projectData.location && projectData.type);
      case 2:
        return true; // File upload is optional
      case 3:
        return true; // Review step
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const createProject = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Create project with auto-generated name if not provided
      const projectName = projectData.name || `פרויקט ${projectData.location}`;
      
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          name: projectName,
          type: projectData.type || null,
          location: projectData.location || null,
          budget: projectData.budget ? parseFloat(projectData.budget.replace(/[^\d]/g, '')) : null,
          timeline_start: new Date().toISOString().split('T')[0], // Current date
          timeline_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // One year from now
          status: projectData.status || "draft"
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Upload files if any
      if (files.length > 0) {
        setUploading(true);
        for (const fileWithMetadata of files) {
          const { file, customName, description } = fileWithMetadata;
          const fileExt = file.name.split('.').pop();
          const fileName = `${project.id}/${Date.now()}.${fileExt}`;
          
          const { data: fileData, error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(fileName, file);

          if (uploadError) {
            console.error('File upload error:', uploadError);
            continue;
          }

          // Create file record with custom metadata
          await supabase
            .from("project_files")
            .insert({
              project_id: project.id,
              file_url: fileData.path,
              file_name: file.name, // Original filename
              custom_name: customName, // User-provided name
              description: description, // User-provided description
              file_type: file.type,
              size_mb: file.size / (1024 * 1024),
              ai_summary: "AI summary pending..." // Mock AI summary
            });
        }
      }

      // Log activity
      await supabase
        .from("activity_log")
        .insert({
          project_id: project.id,
          actor_type: "entrepreneur",
          actor_id: user.id,
          action: "PROJECT_CREATED",
          meta: { project_name: projectName }
        });

      toast({
        title: "הפרויקט נוצר בהצלחה",
        description: "הפרויקט נוצר בהצלחה וממתין להצעות",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת הפרויקט",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
      setUploading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location">מיקום הפרויקט <span className="text-destructive">*</span></Label>
              <Input
                id="location"
                placeholder="עיר או כתובת מלאה..."
                value={projectData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                aria-required="true"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">שם הפרויקט</Label>
              <Input
                id="name"
                placeholder="השאר ריק לשם אוטומטי על פי המיקום"
                value={projectData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">סוג פרויקט <span className="text-destructive">*</span></Label>
              <Select value={projectData.type} onValueChange={(value) => handleInputChange("type", value)} disabled={advisorsLoading}>
                <SelectTrigger aria-required="true">
                  <SelectValue placeholder={advisorsLoading ? "טוען..." : "בחר סוג פרויקט..."} />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">סטטוס פרויקט</Label>
              <Select value={projectData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סטטוס..." />
                </SelectTrigger>
                <SelectContent>
                  {projectStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="budget">תקציב פרויקט</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₪</span>
                <Input
                  id="budget"
                  placeholder="הזן תקציב..."
                  value={formatCurrency(projectData.budget)}
                  onChange={(e) => handleBudgetChange("budget", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="advisorBudget">תקציב יועצים</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₪</span>
                <Input
                  id="advisorBudget"
                  placeholder="הזן תקציב יועצים..."
                  value={formatCurrency(projectData.advisorBudget)}
                  onChange={(e) => handleBudgetChange("advisorBudget", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">תיאור הפרויקט</Label>
              <Textarea
                id="description"
                placeholder="תארו את הפרויקט - מספר קומות, מספר יחידות, סה״כ שטח עיקרי, שטח שירות וכל דבר אחר שחשוב לכם"
                value={projectData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={4}
              />
            </div>
            
            <p className="text-xs text-muted-foreground text-right">* שדה נדרש</p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">העלאת מסמכים</h3>
              <p className="text-muted-foreground mb-4">
                העלה עד 5 קבצים: תוכניות, דרישות טכניות, מפרטים (PDF/Word, עד 10MB כל אחד)
              </p>
              
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button variant="tech" asChild>
                  <span>בחר קבצים</span>
                </Button>
              </label>
            </div>
            
            {files.length > 0 && (
              <div className="space-y-4">
                <Label>קבצים שנבחרו:</Label>
                {files.map((fileWithMetadata, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 ml-2 text-muted-foreground" />
                        <span className="text-sm font-medium">{fileWithMetadata.file.name}</span>
                        <span className="text-xs text-muted-foreground mr-2">
                          ({(fileWithMetadata.file.size / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        ✕
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor={`file-name-${index}`} className="text-sm">שם הקובץ</Label>
                        <Input
                          id={`file-name-${index}`}
                          placeholder="הזן שם לקובץ..."
                          value={fileWithMetadata.customName}
                          onChange={(e) => {
                            const newFiles = [...files];
                            newFiles[index].customName = e.target.value;
                            setFiles(newFiles);
                          }}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`file-desc-${index}`} className="text-sm">תיאור (אופציונלי)</Label>
                        <Textarea
                          id={`file-desc-${index}`}
                          placeholder="הוסף תיאור לקובץ..."
                          value={fileWithMetadata.description}
                          onChange={(e) => {
                            const newFiles = [...files];
                            newFiles[index].description = e.target.value;
                            setFiles(newFiles);
                          }}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 mx-auto text-construction-success mb-4" />
              <h3 className="text-xl font-semibold mb-2">סקירת הפרויקט</h3>
              <p className="text-muted-foreground">בדוק את הפרטים לפני יצירת הפרויקט</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">מיקום</Label>
                  <p>{projectData.location}</p>
                </div>
                <div>
                  <Label className="font-semibold">שם הפרויקט</Label>
                  <p>{projectData.name || `פרויקט ${projectData.location}`}</p>
                </div>
                {projectData.type && (
                  <div>
                    <Label className="font-semibold">סוג פרויקט</Label>
                    <p>{projectData.type}</p>
                  </div>
                )}
                {projectData.status && (
                  <div>
                    <Label className="font-semibold">סטטוס פרויקט</Label>
                    <p>{projectData.status}</p>
                  </div>
                )}
                {projectData.budget && (
                  <div>
                    <Label className="font-semibold">תקציב פרויקט</Label>
                    <p>₪{formatCurrency(projectData.budget)}</p>
                  </div>
                )}
                {projectData.advisorBudget && (
                  <div>
                    <Label className="font-semibold">תקציב יועצים</Label>
                    <p>₪{formatCurrency(projectData.advisorBudget)}</p>
                  </div>
                )}
              </div>
              
              {projectData.description && (
                <div>
                  <Label className="font-semibold">תיאור</Label>
                  <p className="text-sm text-muted-foreground">{projectData.description}</p>
                </div>
              )}
              
              {files.length > 0 && (
                <div>
                  <Label className="font-semibold">קבצים ({files.length})</Label>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {files.map((fileWithMetadata, index) => (
                      <li key={index} className="flex flex-col">
                        <span>• {fileWithMetadata.customName || fileWithMetadata.file.name}</span>
                        {fileWithMetadata.description && (
                          <span className="text-xs mr-4 text-muted-foreground/70">
                            {fileWithMetadata.description}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזרה ללוח הבקרה
            </Button>
            <h1 className="text-3xl font-bold text-foreground mb-2">פרויקט חדש</h1>
            <p className="text-muted-foreground">יצירת פרויקט חדש לבחירת ספקים</p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">שלב {currentStep} מתוך {totalSteps}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && "פרטי הפרויקט"}
                {currentStep === 2 && "העלאת מסמכים"}
                {currentStep === 3 && "סקירה ואישור"}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "הזן את הפרטים הבסיסיים של הפרויקט"}
                {currentStep === 2 && "העלה מסמכים רלוונטיים לפרויקט (אופציונלי)"}
                {currentStep === 3 && "בדוק את הפרטים ולחץ על יצירת פרויקט"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStep()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              הקודם
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                onClick={nextStep}
                disabled={!validateStep(currentStep)}
                variant="tech"
              >
                הבא
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
            ) : (
              <Button
                onClick={createProject}
                disabled={creating || uploading}
                variant="tech"
              >
                {creating ? "יוצר פרויקט..." : uploading ? "מעלה קבצים..." : "צור פרויקט"}
                {!creating && !uploading && <CheckCircle className="w-4 h-4 mr-2" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectWizard;