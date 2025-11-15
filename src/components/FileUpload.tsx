import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: string;
  onUpload: (files: UploadedFile[]) => void;
  proposalId?: string;
  advisorId?: string; // Required for temp folder uploads when proposalId is not available
  existingFiles?: UploadedFile[];
}

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  mime: string;
  uploaded_at: string;
  virus_scan_status?: 'clean' | 'scanning' | 'infected';
}

export function FileUpload({
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10 MB
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip',
  onUpload,
  proposalId,
  advisorId,
  existingFiles = []
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    
    // Validate total count
    if (files.length + acceptedFiles.length > maxFiles) {
      setError(`ניתן להעלות עד ${maxFiles} קבצים`);
      return;
    }

    // Validate individual file sizes
    const oversizedFiles = acceptedFiles.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`הקבצים הבאים גדולים מדי: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        setProgress(((i + 1) / acceptedFiles.length) * 100);

        // Use temp-{advisorId} folder if no proposalId, otherwise use proposalId folder
        const folderPath = proposalId 
          ? proposalId 
          : advisorId 
            ? `temp-${advisorId}` 
            : 'temp-unknown';
        
        const filePath = `${folderPath}/${crypto.randomUUID()}-${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('proposal-files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          setError(`שגיאה בהעלאת ${file.name}: ${uploadError.message}`);
          continue;
        }

        const uploadedFile: UploadedFile = {
          url: filePath,
          name: file.name,
          size: file.size,
          mime: file.type,
          uploaded_at: new Date().toISOString(),
          virus_scan_status: 'clean' // TODO: Implement actual scanning
        };

        uploadedFiles.push(uploadedFile);
      }

      const newFiles = [...files, ...uploadedFiles];
      setFiles(newFiles);
      onUpload(newFiles);

      toast({
        title: 'הקבצים הועלו בהצלחה',
        description: `${uploadedFiles.length} קבצים הועלו`,
      });
    } catch (err) {
      console.error('Upload error:', err);
      setError('שגיאה בהעלאת הקבצים');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [files, maxFiles, maxSize, proposalId, advisorId, onUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: accept.split(',').reduce((acc, ext) => ({ ...acc, [ext]: [] }), {}),
    disabled: uploading || files.length >= maxFiles
  });

  const removeFile = async (index: number) => {
    const fileToRemove = files[index];
    
    // Delete from storage
    const { error } = await supabase.storage
      .from('proposal-files')
      .remove([fileToRemove.url]);

    if (error) {
      console.error('Delete error:', error);
      toast({
        title: 'שגיאה במחיקת הקובץ',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onUpload(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-primary/30'}
          ${uploading || files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-muted/50'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-muted-foreground">שחררו את הקבצים כאן...</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">גררו קבצים לכאן או לחצו לבחירה</p>
            <p className="text-xs text-muted-foreground">
              עד {maxFiles} קבצים, מקסימום {formatFileSize(maxSize)} לקובץ
            </p>
            <p className="text-xs text-muted-foreground">
              פורמטים נתמכים: PDF, Word, Excel, תמונות, ZIP
            </p>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploading && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">מעלה קבצים...</p>
          <Progress value={progress} />
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            קבצים מצורפים ({files.length}/{maxFiles})
          </p>
          {files.map((file, index) => (
            <Card key={index}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  {file.virus_scan_status === 'clean' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
