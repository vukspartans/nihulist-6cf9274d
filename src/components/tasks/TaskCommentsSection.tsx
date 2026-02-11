import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Send, MessageSquare, Loader2 } from 'lucide-react';
import { useTaskComments } from '@/hooks/useTaskComments';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface TaskCommentsSectionProps {
  taskId: string;
}

export function TaskCommentsSection({ taskId }: TaskCommentsSectionProps) {
  const { comments, loading, submitting, addComment, deleteComment } = useTaskComments(taskId);
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    await addComment(newComment);
    setNewComment('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
    <div className="flex flex-col h-full space-y-4">
      {/* Comments list */}
      <div className="flex-1 space-y-3 max-h-[40vh] overflow-y-auto">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">אין תגובות עדיין</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isOwn = comment.author_id === user?.id;
            return (
              <div
                key={comment.id}
                className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    isOwn
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-muted border border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{comment.author_name}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {comment.author_role === 'advisor' ? 'יועץ' : 'יזם'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground mr-auto">
                      {format(new Date(comment.created_at), 'dd/MM HH:mm', { locale: he })}
                    </span>
                    {isOwn && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-50 hover:opacity-100"
                        onClick={() => deleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New comment input */}
      <div className="flex gap-2 items-end border-t pt-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="כתוב תגובה..."
          rows={2}
          className="min-h-[60px] resize-none"
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={submitting || !newComment.trim()}
          className="shrink-0"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
