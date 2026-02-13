import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, UserPlus } from 'lucide-react';
import { useTaskObservers } from '@/hooks/useTaskObservers';
import type { ProjectAdvisorOption } from '@/types/task';

interface TaskObserversSectionProps {
  taskId: string;
  projectAdvisors: ProjectAdvisorOption[];
  assignedAdvisorId?: string | null;
}

export function TaskObserversSection({ taskId, projectAdvisors, assignedAdvisorId }: TaskObserversSectionProps) {
  const { observers, loading, addObserver, removeObserver } = useTaskObservers(taskId);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('');

  // Filter out already-observed and assigned advisors
  const availableAdvisors = projectAdvisors.filter(
    pa => pa.advisor_id !== assignedAdvisorId &&
      !observers.some(o => o.advisor_id === pa.advisor_id)
  );

  const handleAdd = async () => {
    if (!selectedAdvisorId) return;
    const success = await addObserver(selectedAdvisorId);
    if (success) setSelectedAdvisorId('');
  };

  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-xs text-muted-foreground">
        יועצים מכותבים יכולים לראות את המשימה מבלי להיות אחראים ישירים עליה.
      </p>

      {/* Current observers */}
      {observers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {observers.map(o => (
            <Badge key={o.id} variant="secondary" className="gap-1 pr-1">
              {o.company_name || 'יועץ'}
              <button
                onClick={() => removeObserver(o.advisor_id)}
                className="hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">אין מכותבים למשימה זו</p>
      )}

      {/* Add observer */}
      {availableAdvisors.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedAdvisorId} onValueChange={setSelectedAdvisorId} dir="rtl">
            <SelectTrigger className="flex-1 text-right text-xs h-8">
              <SelectValue placeholder="בחר יועץ להוספה" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {availableAdvisors.map(pa => (
                <SelectItem key={pa.advisor_id} value={pa.advisor_id}>
                  {pa.company_name || 'יועץ'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={!selectedAdvisorId || loading}
            className="h-8 gap-1 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            הוסף
          </Button>
        </div>
      )}
    </div>
  );
}
