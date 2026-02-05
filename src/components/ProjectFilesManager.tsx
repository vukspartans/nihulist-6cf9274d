import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { AIAnalysisDisplay } from '@/components/AIAnalysisDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  Download, 
  Trash2, 
  Eye, 
  Brain,
  Loader2,
  Edit3,
  CheckCircle2
} from 'lucide-react';

interface ProjectFile {
  id: string;
  file_name: string;
  custom_name: string | null;
  description: string | null;
  file_type: string;
  file_url: string;
  size_mb: number;
  ai_summary: string | null;
  created_at: string;
}

interface ProjectFilesManagerProps {
  projectId: string;
  files: ProjectFile[];
  onFilesUpdate: () => void;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
  if (fileType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
  return <File className="h-8 w-8 text-gray-500" />;
};

const formatFileSize = (sizeMB: number) => {
  if (sizeMB < 1) return `${Math.round(sizeMB * 1024)} KB`;
  return `${sizeMB.toFixed(1)} MB`;
};

export const ProjectFilesManager = ({ projectId, files, onFilesUpdate }: ProjectFilesManagerProps) => {
  const [uploading, setUploading] = useState(false);
  const [analyzingFiles, setAnalyzingFiles] = useState<Set<string>>(new Set());
  const [editingFile, setEditingFile] = useState<ProjectFile | null>(null);
  const [editForm, setEditForm] = useState({ custom_name: '', description: '' });
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    
    const uploadedFileIds: string[] = [];
    const failedFiles: { file: File; error: string }[] = [];
    
    for (const file of acceptedFiles) {
      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file, { upsert: false, contentType: file.type });

        if (uploadError) {
          failedFiles.push({ file, error: uploadError.message });
          continue; // Continue with next file instead of throwing
        }

        // Save file metadata to database (store the storage path, not a public URL)
        const { data: insertedFile, error: dbError } = await supabase
          .from('project_files')
          .insert({
            project_id: projectId,
            file_name: file.name,
            file_type: file.type || 'application/octet-stream',
            file_url: fileName,
            size_mb: Number((file.size / (1024 * 1024)).toFixed(2))
          })
          .select('id')
          .single();

        if (dbError) {
          failedFiles.push({ file, error: dbError.message });
          continue;
        }
        
        if (insertedFile) {
          uploadedFileIds.push(insertedFile.id);
        }
      } catch (error) {
        failedFiles.push({ 
          file, 
          error: error instanceof Error ? error.message : 'שגיאה לא ידועה' 
        });
      }
    }

    // Show appropriate toast based on results
    if (uploadedFileIds.length > 0 && failedFiles.length === 0) {
      toast({
        title: "הקבצים הועלו בהצלחה",
        description: `${uploadedFileIds.length} קבצים הועלו לפרויקט.`,
      });
    } else if (uploadedFileIds.length > 0 && failedFiles.length > 0) {
      toast({
        title: "חלק מהקבצים הועלו",
        description: `${uploadedFileIds.length} הצליחו, ${failedFiles.length} נכשלו: ${failedFiles.map(f => f.file.name).join(', ')}`,
        variant: "destructive",
      });
    } else if (failedFiles.length > 0) {
      toast({
        title: "העלאה נכשלה",
        description: `כל ${failedFiles.length} הקבצים נכשלו: ${failedFiles[0].error}`,
        variant: "destructive",
      });
    }

    onFilesUpdate();
    
    // Note: AI analysis is now user-triggered only (via manual "Analyze" button)
    
    setUploading(false);
  }, [projectId, onFilesUpdate, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/*': ['.txt', '.csv']
    },
    maxSize: 20 * 1024 * 1024, // 20MB limit
  });

  const getStoragePath = useCallback((fileUrl: string) => {
    if (!fileUrl) return '';
    if (/^https?:\/\//.test(fileUrl)) {
      try {
        const url = new URL(fileUrl);
        const candidates = [
          '/storage/v1/object/public/project-files/',
          '/storage/v1/object/sign/project-files/',
          '/storage/v1/object/project-files/',
          '/storage/v1/object/auth/project-files/',
        ];
        for (const prefix of candidates) {
          const idx = url.pathname.indexOf(prefix);
          if (idx >= 0) {
            return url.pathname.slice(idx + prefix.length);
          }
        }
        const parts = url.pathname.split('/project-files/');
        if (parts.length > 1) return parts[1];
      } catch {}
      return fileUrl;
    }
    return fileUrl;
  }, []);

  const openFile = async (file: ProjectFile) => {
    const path = getStoragePath(file.file_url);
    try {
      const { data, error } = await supabase
        .storage
        .from('project-files')
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      
      // Use link click approach instead of window.open() to avoid popup blockers
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Open file error:', error);
      toast({
        title: "נכשל בפתיחת הקובץ",
        description: error instanceof Error ? error.message : "לא ניתן ליצור קישור מאובטח",
        variant: "destructive",
      });
    }
  };

  const downloadFile = async (file: ProjectFile) => {
    const path = getStoragePath(file.file_url);
    try {
      const { data, error } = await supabase
        .storage
        .from('project-files')
        .createSignedUrl(path, 60 * 60, {
          download: file.custom_name || file.file_name,
        });
      if (error) throw error;
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.custom_name || file.file_name;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download file error:', error);
      toast({
        title: "הורדה נכשלה",
        description: error instanceof Error ? error.message : "לא ניתן ליצור קישור מאובטח",
        variant: "destructive",
      });
    }
  };

  const analyzeFile = async (fileId: string, forceRefresh = false) => {
    setAnalyzingFiles(prev => new Set([...prev, fileId]));
    
    try {
      // Fetch file data fresh from database instead of using stale props
      const { data: file, error: fetchError } = await supabase
        .from('project_files')
        .select('*')
        .eq('id', fileId)
        .single();
      
      if (fetchError || !file) {
        toast({ title: 'הקובץ לא נמצא', variant: 'destructive' });
        return;
      }

      // Check if analysis already exists and not forcing refresh
      if (file.ai_summary && !forceRefresh) {
        toast({
          title: 'ניתוח AI כבר קיים לקובץ זה',
          description: 'לחץ על "נתח מחדש" כדי לבצע ניתוח חדש',
          action: (
            <Button variant="outline" size="sm" onClick={() => analyzeFile(fileId, true)}>
              נתח מחדש
            </Button>
          )
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-project-file', {
        body: { fileId, forceRefresh }
      });

      if (error) throw error;

      if (data?.success || data?.analysis) {
        onFilesUpdate();
        toast({ title: forceRefresh ? 'הניתוח עודכן בהצלחה' : 'הניתוח הושלם בהצלחה' });
      }
    } catch (error) {
      console.error('Error analyzing file:', error);
      toast({ title: 'שגיאה בניתוח הקובץ', variant: 'destructive' });
    } finally {
      setAnalyzingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const deleteFile = async (file: ProjectFile) => {
    try {
      // Resolve storage path (supports legacy public URLs and storage paths)
      const filePath = getStoragePath(file.file_url);
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: "קובץ נמחק",
        description: "הקובץ הוסר מהפרויקט.",
      });
      
      onFilesUpdate();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "מחיקה נכשלה",
        description: error instanceof Error ? error.message : "נכשל במחיקת הקובץ",
        variant: "destructive",
      });
    }
  };

  const updateFileMetadata = async () => {
    if (!editingFile) return;

    try {
      const { error } = await supabase
        .from('project_files')
        .update({
          custom_name: editForm.custom_name || null,
          description: editForm.description || null
        })
        .eq('id', editingFile.id);

      if (error) throw error;

      toast({
        title: "קובץ עודכן",
        description: "פרטי הקובץ עודכנו בהצלחה.",
      });
      
      setEditingFile(null);
      onFilesUpdate();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "עדכון נכשל",
        description: error instanceof Error ? error.message : "נכשל בעדכון הקובץ",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (file: ProjectFile) => {
    setEditingFile(file);
    setEditForm({
      custom_name: file.custom_name || '',
      description: file.description || ''
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6" dir="rtl">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">העלאת קבצים</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>מעלה קבצים...</span>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? 'שחרר קבצים כאן' : 'גרור ושחרר קבצים כאן'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  או לחץ לבחירת קבצים (מקסימום 20MB לקובץ)
                </p>
                <Button variant="outline" disabled={uploading}>
                  בחירת קבצים
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">קבצי הפרויקט ({files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              לא הועלו קבצים עדיין. העלה קבצים לשיפור ניתוח הפרויקט.
            </div>
          ) : (
            <ScrollArea className="h-[400px]" dir="rtl">
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getFileIcon(file.file_type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium truncate text-right">
                              {file.custom_name || file.file_name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {formatFileSize(file.size_mb)}
                            </Badge>
                            {file.ai_summary ? (
                              <Badge variant="outline" className="text-xs border-green-500/50 bg-green-500/10 text-green-700">
                                <CheckCircle2 className="h-3 w-3 ml-1" />
                                נותח ע"י AI
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-orange-500/50 bg-orange-500/10 text-orange-700">
                                <Loader2 className="h-3 w-3 ml-1 animate-spin" />
                                ממתין לניתוח
                              </Badge>
                            )}
                          </div>
                          {file.custom_name && (
                            <p className="text-sm text-muted-foreground mb-1 text-right">
                              שם מקורי: {file.file_name}
                            </p>
                          )}
                          {file.description && (
                            <p className="text-sm text-muted-foreground mb-2 text-right">
                              {file.description}
                            </p>
                          )}
                          {file.ai_summary && (
                            <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mt-2">
                              <div className="flex items-start gap-2 mb-2">
                                <Brain className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-foreground/90 line-clamp-3 leading-relaxed text-right flex-1">
                                  <AIAnalysisDisplay content={file.ai_summary.split('\n').slice(0, 4).join('\n')} />
                                </div>
                              </div>
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                    הצג ניתוח מלא ←
                                  </Button>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-[450px]" align="start">
                                  <div className="space-y-2">
                                    <h5 className="font-semibold text-sm flex items-center gap-2">
                                      <Brain className="h-4 w-4 text-primary" />
                                      ניתוח AI מלא
                                    </h5>
                                    <div className="max-h-[400px] overflow-y-auto">
                                      <AIAnalysisDisplay content={file.ai_summary} className="text-sm" />
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2 text-right">
                            הועלה {new Date(file.created_at).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-row-reverse">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openFile(file)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>צפייה בקובץ</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(file)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>הורדת קובץ</p>
                          </TooltipContent>
                        </Tooltip>
                        <Dialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(file)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>עריכת פרטים</p>
                            </TooltipContent>
                          </Tooltip>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>עריכת פרטי קובץ</DialogTitle>
                              <DialogDescription>
                                ערוך את השם המותאם והתיאור של הקובץ
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="custom_name">שם מותאם</Label>
                                <Input
                                  id="custom_name"
                                  value={editForm.custom_name}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, custom_name: e.target.value }))}
                                  placeholder={file.file_name}
                                />
                              </div>
                              <div>
                                <Label htmlFor="description">תיאור</Label>
                                <Textarea
                                  id="description"
                                  value={editForm.description}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="הוסף תיאור לקובץ הזה..."
                                />
                              </div>
                              <Button onClick={updateFileMetadata} className="w-full">
                                עדכן קובץ
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => analyzeFile(file.id)}
                              disabled={analyzingFiles.has(file.id)}
                            >
                              {analyzingFiles.has(file.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Brain className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>ניתוח AI</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteFile(file)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>מחיקת קובץ</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      </div>
    </TooltipProvider>
  );
};