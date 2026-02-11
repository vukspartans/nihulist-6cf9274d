import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
}

export function useTaskComments(taskId: string | null) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, profile, primaryRole } = useAuth();

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data as TaskComment[]) || []);
    } catch (err) {
      console.error('[TaskComments] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(async (content: string) => {
    if (!taskId || !user || !content.trim()) return;
    setSubmitting(true);
    try {
      const authorRole = primaryRole === 'advisor' ? 'advisor' : 'entrepreneur';
      const authorName = profile?.name || user.email || 'משתמש';

      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          author_id: user.id,
          author_name: authorName,
          author_role: authorRole,
          content: content.trim(),
        });

      if (error) throw error;
      await fetchComments();
    } catch (err) {
      console.error('[TaskComments] add error:', err);
      toast({ title: 'שגיאה', description: 'לא ניתן להוסיף תגובה', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [taskId, user, profile, primaryRole, fetchComments]);

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('[TaskComments] delete error:', err);
      toast({ title: 'שגיאה', description: 'לא ניתן למחוק תגובה', variant: 'destructive' });
    }
  }, []);

  return { comments, loading, submitting, addComment, deleteComment, refetch: fetchComments };
}
