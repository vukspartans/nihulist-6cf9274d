import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { useAutoTaskLoader } from '@/hooks/useAutoTaskLoader';
import { useState } from 'react';

interface AutoTaskSuggestionBannerProps {
  projectId: string;
  projectType: string | null;
  projectPhase: string | null;
  onTasksCreated: () => void;
}

export function AutoTaskSuggestionBanner({
  projectId,
  projectType,
  projectPhase,
  onTasksCreated,
}: AutoTaskSuggestionBannerProps) {
  const { templates, shouldSuggest, loading, loadTasks, dismiss } = useAutoTaskLoader({
    projectId,
    projectType,
    projectPhase,
    hasExistingTasks: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  if (loading) return null;
  if (!shouldSuggest) return null;

  const handleLoad = async () => {
    setIsCreating(true);
    await loadTasks();
    setIsCreating(false);
    onTasksCreated();
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex items-center justify-between gap-4" dir="rtl">
        <div className="flex items-center gap-3 flex-1">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium">
              מצאנו {templates.length} משימות מומלצות לפרויקט
              {projectType ? ` מסוג "${projectType}"` : ''}
              {projectPhase ? ` בשלב "${projectPhase}"` : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              טען את המשימות כדי להתחיל לעבוד מהר יותר
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={handleLoad} disabled={isCreating}>
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
            טען משימות
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
