import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

interface PaymentFileUploadProps {
  projectId: string;
  value: string | null;
  onChange: (path: string | null) => void;
}

export function PaymentFileUpload({ projectId, value, onChange }: PaymentFileUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'קובץ גדול מדי', description: 'גודל מקסימלי 20MB', variant: 'destructive' });
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'סוג קובץ לא נתמך', description: 'PDF, תמונות או מסמכי Word בלבד', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const storagePath = `${projectId}/draft/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('payment-files')
        .upload(storagePath, file);

      if (error) throw error;

      setFileName(file.name);
      onChange(storagePath);
      toast({ title: 'הקובץ הועלה בהצלחה' });
    } catch (err) {
      console.error('[PaymentFileUpload] Error:', err);
      toast({ title: 'שגיאה בהעלאה', description: 'לא ניתן להעלות את הקובץ', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [projectId, onChange, toast]);

  const handleRemove = useCallback(async () => {
    if (value) {
      await supabase.storage.from('payment-files').remove([value]);
    }
    setFileName(null);
    onChange(null);
  }, [value, onChange]);

  if (value) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate flex-1">{fileName || 'קובץ מצורף'}</span>
        <Button type="button" variant="ghost" size="sm" onClick={handleRemove} className="h-7 w-7 p-0">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        <span>{uploading ? 'מעלה...' : 'צרף קובץ (PDF, תמונה)'}</span>
        <input
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
