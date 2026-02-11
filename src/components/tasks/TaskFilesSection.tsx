import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload, Download, Trash2, FileText, Loader2 } from 'lucide-react';
import { useTaskFiles } from '@/hooks/useTaskFiles';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface TaskFilesSectionProps {
  taskId: string;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskFilesSection({ taskId }: TaskFilesSectionProps) {
  const { files, loading, uploading, uploadFile, deleteFile, getSignedUrl } = useTaskFiles(taskId);
  const { user } = useAuth();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => uploadFile(file));
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024,
    maxFiles: 5,
    disabled: uploading,
  });

  const handleDownload = async (storagePath: string, originalName: string) => {
    const url = await getSignedUrl(storagePath);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.target = '_blank';
      a.click();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">מעלה קובץ...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? 'שחרר כאן' : 'גרור קבצים לכאן או לחץ לבחירה'}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, Excel, תמונות, ZIP • עד 20MB • עד 5 קבצים
            </p>
          </div>
        )}
      </div>

      {/* Files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0 text-right">
                <p className="text-sm font-medium truncate">{file.original_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.file_size)}
                  {' • '}
                  {format(new Date(file.uploaded_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDownload(file.storage_path, file.original_name)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {file.uploaded_by === user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteFile(file.id, file.storage_path)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <p className="text-sm text-muted-foreground text-right py-2">אין קבצים מצורפים</p>
      )}
    </div>
  );
}
