import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LayoutList, Table as TableIcon } from 'lucide-react';
import { AllProjectsTaskTable } from './AllProjectsTaskTable';
import { TaskStatusBadge } from './TaskStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { PROJECT_PHASES } from '@/constants/project';
import type { ProjectTaskWithDetails } from '@/hooks/useAllProjectsTasks';

interface ProjectTaskViewProps {
  tasks: ProjectTaskWithDetails[];
  projectId: string;
}

export function ProjectTaskView({ tasks, projectId }: ProjectTaskViewProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const projectTasks = useMemo(
    () => tasks.filter(t => t.project_id === projectId),
    [tasks, projectId]
  );

  // Group tasks by phase for card view
  const tasksByPhase = useMemo(() => {
    const grouped: Record<string, ProjectTaskWithDetails[]> = {};
    projectTasks.forEach(t => {
      const phase = t.phase || 'ללא שלב';
      if (!grouped[phase]) grouped[phase] = [];
      grouped[phase].push(t);
    });
    return grouped;
  }, [projectTasks]);

  const phasesWithTasks = useMemo(() => {
    // Include only phases that have tasks, maintain PROJECT_PHASES order
    const ordered = PROJECT_PHASES.filter(p => tasksByPhase[p]);
    // Add any tasks with non-standard or null phases
    const extra = Object.keys(tasksByPhase).filter(
      p => !PROJECT_PHASES.includes(p as any)
    );
    return [...ordered, ...extra];
  }, [tasksByPhase]);

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('he-IL');
  };

  if (projectTasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">אין משימות בפרויקט זה</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'cards' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('cards')}
        >
          <LayoutList className="w-4 h-4 ml-1" />
          כרטיסיות
        </Button>
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('table')}
        >
          <TableIcon className="w-4 h-4 ml-1" />
          טבלה
        </Button>
      </div>

      {viewMode === 'table' ? (
        <AllProjectsTaskTable tasks={projectTasks} />
      ) : (
        <Tabs defaultValue={phasesWithTasks[0] || ''} dir="rtl">
          <TabsList className="flex-wrap h-auto gap-1">
            {phasesWithTasks.map(phase => (
              <TabsTrigger key={phase} value={phase} className="text-xs">
                {phase}
                <Badge variant="secondary" className="mr-1 text-[10px] h-4 px-1">
                  {tasksByPhase[phase]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {phasesWithTasks.map(phase => (
            <TabsContent key={phase} value={phase}>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {(tasksByPhase[phase] || []).map(task => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-medium text-sm leading-tight flex-1">{task.name}</h4>
                        <TaskStatusBadge status={task.status} />
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{task.advisor_name || 'לא שויך'}</span>
                        <span>{formatDate(task.planned_end_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={task.progress_percent || 0} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{task.progress_percent || 0}%</span>
                      </div>
                      {task.is_payment_critical && (
                        <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-600">
                          קריטי לתשלום
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
