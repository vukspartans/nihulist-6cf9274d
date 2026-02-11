import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface TaskFile {
  id: string;
  task_id: string;
  storage_path: string;
  original_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 5;

export function useTaskFiles(taskId: string | null) {
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const fetchFiles = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_files')
        .select('*')
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles((data as TaskFile[]) || []);
    } catch (err) {
      console.error('[TaskFiles] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = useCallback(async (file: File) => {
    if (!taskId || !user) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'שגיאה', description: 'גודל הקובץ חורג מ-20MB', variant: 'destructive' });
      return;
    }

    if (files.length >= MAX_FILES) {
      toast({ title: 'שגיאה', description: `ניתן להעלות עד ${MAX_FILES} קבצים למשימה`, variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uniqueName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${taskId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('task_files')
        .insert({
          task_id: taskId,
          storage_path: storagePath,
          original_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      await fetchFiles();
      toast({ title: 'הקובץ הועלה בהצלחה' });
    } catch (err) {
      console.error('[TaskFiles] upload error:', err);
      toast({ title: 'שגיאה', description: 'העלאת הקובץ נכשלה', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [taskId, user, files.length, fetchFiles]);

  const deleteFile = useCallback(async (fileId: string, storagePath: string) => {
    try {
      await supabase.storage.from('task-files').remove([storagePath]);

      const { error } = await supabase
        .from('task_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast({ title: 'הקובץ נמחק' });
    } catch (err) {
      console.error('[TaskFiles] delete error:', err);
      toast({ title: 'שגיאה', description: 'מחיקת הקובץ נכשלה', variant: 'destructive' });
    }
  }, []);

  const getSignedUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('task-files')
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error('[TaskFiles] signed URL error:', err);
      return null;
    }
  }, []);

  return { files, loading, uploading, uploadFile, deleteFile, getSignedUrl, refetch: fetchFiles };
}
