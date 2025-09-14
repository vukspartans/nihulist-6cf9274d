import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Edit3
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
    
    try {
      for (const file of acceptedFiles) {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(fileName);

        // Save file metadata to database
        const { error: dbError } = await supabase
          .from('project_files')
          .insert({
            project_id: projectId,
            file_name: file.name,
            file_type: file.type,
            file_url: publicUrl,
            size_mb: Number((file.size / (1024 * 1024)).toFixed(2))
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Files uploaded successfully",
        description: `${acceptedFiles.length} file(s) uploaded to the project.`,
      });
      
      onFilesUpdate();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
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

  const analyzeFile = async (fileId: string) => {
    setAnalyzingFiles(prev => new Set(prev).add(fileId));
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-project-file', {
        body: { fileId }
      });

      if (error) throw error;

      toast({
        title: "File analyzed successfully",
        description: "AI analysis has been completed and saved.",
      });
      
      onFilesUpdate();
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze file",
        variant: "destructive",
      });
    } finally {
      setAnalyzingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  const deleteFile = async (file: ProjectFile) => {
    try {
      // Extract file path from URL
      const url = new URL(file.file_url);
      const filePath = url.pathname.split('/storage/v1/object/public/project-files/')[1];
      
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
        title: "File deleted",
        description: "File has been removed from the project.",
      });
      
      onFilesUpdate();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
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
        title: "File updated",
        description: "File metadata has been updated.",
      });
      
      setEditingFile(null);
      onFilesUpdate();
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update file",
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
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
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
                <span>Uploading files...</span>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to select files (max 20MB per file)
                </p>
                <Button variant="outline" disabled={uploading}>
                  Select Files
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle>Project Files ({files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No files uploaded yet. Upload files to enhance project analysis.
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      {getFileIcon(file.file_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">
                            {file.custom_name || file.file_name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {formatFileSize(file.size_mb)}
                          </Badge>
                        </div>
                        {file.custom_name && (
                          <p className="text-sm text-muted-foreground mb-1">
                            Original: {file.file_name}
                          </p>
                        )}
                        {file.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {file.description}
                          </p>
                        )}
                        {file.ai_summary && (
                          <div className="bg-muted/50 rounded-md p-3 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Brain className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">AI Analysis</span>
                            </div>
                            <p className="text-sm">{file.ai_summary}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(file.file_url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = file.file_url;
                            link.download = file.custom_name || file.file_name;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(file)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit File Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="custom_name">Custom Name</Label>
                                <Input
                                  id="custom_name"
                                  value={editForm.custom_name}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, custom_name: e.target.value }))}
                                  placeholder={file.file_name}
                                />
                              </div>
                              <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                  id="description"
                                  value={editForm.description}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Add a description for this file..."
                                />
                              </div>
                              <Button onClick={updateFileMetadata} className="w-full">
                                Update File
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteFile(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
  );
};