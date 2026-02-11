import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LicensingTimeline } from './LicensingTimeline';
import { AllProjectsTaskTable } from './AllProjectsTaskTable';
import { ProjectTaskView } from './ProjectTaskView';
import { TaskFilters } from './TaskFilters';
import { useAllProjectsTasks } from '@/hooks/useAllProjectsTasks';
import { useNavigate } from 'react-router-dom';

export function TaskManagementDashboard() {
  const {
    tasks,
    allTasks,
    projects,
    loading,
    filters,
    setFilters,
    openTasksCount,
    advisorOptions,
  } = useAllProjectsTasks();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const navigate = useNavigate();

  const mode = selectedProjectId ? 'single' : 'all';

  const handleProjectSelect = (value: string) => {
    const pid = value === 'all' ? null : value;
    setSelectedProjectId(pid);
    setFilters(f => ({ ...f, projectId: pid }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Project selector + open tasks count */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedProjectId || 'all'}
          onValueChange={handleProjectSelect}
          dir="rtl"
        >
          <SelectTrigger className="w-[240px] text-right">
            <SelectValue placeholder="כלל הפרויקטים" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כלל הפרויקטים</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="text-sm">
          {openTasksCount} משימות פתוחות
        </Badge>
      </div>

      {/* Timeline */}
      <LicensingTimeline
        mode={mode}
        projects={projects}
        selectedProjectId={selectedProjectId}
      />

      {/* Filters */}
      <TaskFilters
        filters={filters}
        onFiltersChange={setFilters}
        advisorOptions={advisorOptions}
      />

      {/* Content */}
      {mode === 'all' ? (
        <AllProjectsTaskTable
          tasks={tasks}
          onProjectClick={(pid) => {
            setSelectedProjectId(pid);
            setFilters(f => ({ ...f, projectId: pid }));
          }}
        />
      ) : (
        <ProjectTaskView
          tasks={tasks}
          projectId={selectedProjectId!}
        />
      )}
    </div>
  );
}
