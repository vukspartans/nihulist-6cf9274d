import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Upload, FileText, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProjectData {
  name: string;
  type: string;
  location: string;
  budget: string;
  timeline_start: string;
  timeline_end: string;
  description: string;
}

const ProjectWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [projectData, setProjectData] = useState<ProjectData>({
    name: "",
    type: "",
    location: "",
    budget: "",
    timeline_start: "",
    timeline_end: "",
    description: ""
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

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

    setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(projectData.name && projectData.timeline_start && projectData.timeline_end);
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

      // Create project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          owner_id: user.id,
          name: projectData.name,
          type: projectData.type || null,
          location: projectData.location || null,
          budget: projectData.budget ? parseFloat(projectData.budget) : null,
          timeline_start: projectData.timeline_start,
          timeline_end: projectData.timeline_end,
          status: "draft"
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Upload files if any
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${project.id}/${Date.now()}.${fileExt}`;
          
          const { data: fileData, error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(fileName, file);

          if (uploadError) {
            console.error('File upload error:', uploadError);
            continue;
          }

          // Create file record
          await supabase
            .from("project_files")
            .insert({
              project_id: project.id,
              file_url: fileData.path,
              file_name: file.name,
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
          meta: { project_name: projectData.name }
        });

      toast({
        title: "הפרויקט נוצר בהצלחה",
        description: "מעבר להמלצות ספקים...",
      });

      navigate(`/projects/${project.id}/recommendations`);
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
              <Label htmlFor="name">שם הפרויקט *</Label>
              <Input
                id="name"
                placeholder="הזן שם פרויקט..."
                value={projectData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">סוג הפרויקט</Label>
              <Input
                id="type"
                placeholder="למשל: בניית משרדים, שיפוץ בית..."
                value={projectData.type}
                onChange={(e) => handleInputChange("type", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">מיקום</Label>
              <Input
                id="location"
                placeholder="עיר או כתובת..."
                value={projectData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="budget">תקציב (₪)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="הזן תקציב..."
                value={projectData.budget}
                onChange={(e) => handleInputChange("budget", e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeline_start">תאריך התחלה *</Label>
                <Input
                  id="timeline_start"
                  type="date"
                  value={projectData.timeline_start}
                  onChange={(e) => handleInputChange("timeline_start", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeline_end">תאריך סיום *</Label>
                <Input
                  id="timeline_end"
                  type="date"
                  value={projectData.timeline_end}
                  onChange={(e) => handleInputChange("timeline_end", e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">תיאור נוסף</Label>
              <Textarea
                id="description"
                placeholder="תאר את הפרויקט בקצרה..."
                value={projectData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">העלאת מסמכים</h3>
              <p className="text-muted-foreground mb-4">
                העלה עד 5 קבצים (PDF/Word, עד 10MB כל אחד)
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
                <Button variant="construction" asChild>
                  <span>בחר קבצים</span>
                </Button>
              </label>
            </div>
            
            {files.length > 0 && (
              <div className="space-y-2">
                <Label>קבצים שנבחרו:</Label>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 ml-2 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground mr-2">
                        ({(file.size / (1024 * 1024)).toFixed(1)} MB)
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
                  <Label className="font-semibold">שם הפרויקט</Label>
                  <p>{projectData.name}</p>
                </div>
                {projectData.type && (
                  <div>
                    <Label className="font-semibold">סוג</Label>
                    <p>{projectData.type}</p>
                  </div>
                )}
                {projectData.location && (
                  <div>
                    <Label className="font-semibold">מיקום</Label>
                    <p>{projectData.location}</p>
                  </div>
                )}
                {projectData.budget && (
                  <div>
                    <Label className="font-semibold">תקציב</Label>
                    <p>{new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(parseFloat(projectData.budget))}</p>
                  </div>
                )}
                <div>
                  <Label className="font-semibold">לוח זמנים</Label>
                  <p>{new Date(projectData.timeline_start).toLocaleDateString("he-IL")} - {new Date(projectData.timeline_end).toLocaleDateString("he-IL")}</p>
                </div>
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
                  <ul className="text-sm text-muted-foreground">
                    {files.map((file, index) => (
                      <li key={index}>• {file.name}</li>
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
                variant="construction"
              >
                הבא
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
            ) : (
              <Button
                onClick={createProject}
                disabled={creating || uploading}
                variant="construction"
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