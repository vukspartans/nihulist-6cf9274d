import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { LicensingTimeline } from './LicensingTimeline';
import { AllProjectsTaskTable } from './AllProjectsTaskTable';
import { useAdvisorTasks } from '@/hooks/useAdvisorTasks';
import type { TaskStatus } from '@/types/task';
import type { ProjectOption } from '@/hooks/useAllProjectsTasks';

interface AdvisorTasksViewProps {
  advisorId: string;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'ממתין' },
  { value: 'in_progress', label: 'בביצוע' },
  { value: 'blocked', label: 'חסום' },
  { value: 'delayed', label: 'באיחור' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

export function AdvisorTasksView({ advisorId }: AdvisorTasksViewProps) {
  const { tasks, projects, loading, filters, setFilters, openTasksCount } = useAdvisorTasks(advisorId);

  const toggleStatus = (status: TaskStatus) => {
    const current = filters.statuses;
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    setFilters({ ...filters, statuses: next });
  };

  const hasActiveFilters = filters.projectId || filters.statuses.length > 0;

  // Map projects for LicensingTimeline compatibility
  const timelineProjects: ProjectOption[] = projects.map(p => ({
    id: p.id,
    name: p.name,
    phase: p.phase,
    type: p.type,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Licensing Timeline */}
      <LicensingTimeline
        mode={filters.projectId ? 'single' : 'all'}
        projects={timelineProjects}
        selectedProjectId={filters.projectId}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Project filter */}
        <Select
          value={filters.projectId || 'all'}
          onValueChange={(v) => setFilters({ ...filters, projectId: v === 'all' ? null : v })}
          dir="rtl"
        >
          <SelectTrigger className="w-[220px] text-right">
            <SelectValue placeholder="בחר פרויקט" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כל הפרויקטים ({openTasksCount} משימות פתוחות)</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map(opt => (
            <Badge
              key={opt.value}
              variant={filters.statuses.includes(opt.value) ? 'default' : 'outline'}
              className="cursor-pointer select-none"
              onClick={() => toggleStatus(opt.value)}
            >
              {opt.label}
            </Badge>
          ))}
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ projectId: null, statuses: [] })}
            className="h-7 px-2 text-xs"
          >
            <X className="w-3 h-3 ml-1" />
            נקה
          </Button>
        )}
      </div>

      {/* Tasks Table */}
      <AllProjectsTaskTable
        tasks={tasks as any}
        onProjectClick={undefined}
      />
    </div>
  );
}
