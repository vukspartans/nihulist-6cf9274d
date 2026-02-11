import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { TaskFiltersState } from '@/hooks/useAllProjectsTasks';
import type { TaskStatus } from '@/types/task';

interface TaskFiltersProps {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
  advisorOptions: { id: string; name: string }[];
  showProjectFilter?: boolean;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'ממתין' },
  { value: 'in_progress', label: 'בביצוע' },
  { value: 'blocked', label: 'חסום' },
  { value: 'delayed', label: 'באיחור' },
  { value: 'completed', label: 'הושלם' },
  { value: 'cancelled', label: 'בוטל' },
];

export function TaskFilters({ filters, onFiltersChange, advisorOptions, showProjectFilter = false }: TaskFiltersProps) {
  const toggleStatus = (status: TaskStatus) => {
    const current = filters.statuses;
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, statuses: next });
  };

  const hasActiveFilters = filters.advisorId || filters.statuses.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      {/* Advisor filter */}
      {advisorOptions.length > 0 && (
        <Select
          value={filters.advisorId || 'all'}
          onValueChange={(v) => onFiltersChange({ ...filters, advisorId: v === 'all' ? null : v })}
          dir="rtl"
        >
          <SelectTrigger className="w-[180px] text-right">
            <SelectValue placeholder="יועץ" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">כל היועצים</SelectItem>
            {advisorOptions.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
          onClick={() => onFiltersChange({ ...filters, advisorId: null, statuses: [] })}
          className="h-7 px-2 text-xs"
        >
          <X className="w-3 h-3 ml-1" />
          נקה
        </Button>
      )}
    </div>
  );
}
