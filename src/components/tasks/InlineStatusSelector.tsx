import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types/task';
import { useState } from 'react';

interface InlineStatusSelectorProps {
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; bg: string; text: string }[] = [
  { value: 'pending', label: 'ממתין', bg: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-200' },
  { value: 'in_progress', label: 'בביצוע', bg: 'bg-amber-400 dark:bg-amber-600', text: 'text-amber-900 dark:text-amber-100' },
  { value: 'blocked', label: 'חסום', bg: 'bg-red-500 dark:bg-red-600', text: 'text-white' },
  { value: 'completed', label: 'הושלם', bg: 'bg-emerald-500 dark:bg-emerald-600', text: 'text-white' },
  { value: 'delayed', label: 'באיחור', bg: 'bg-orange-500 dark:bg-orange-600', text: 'text-white' },
  { value: 'cancelled', label: 'בוטל', bg: 'bg-gray-400 dark:bg-gray-600', text: 'text-white' },
];

export function InlineStatusSelector({ status, onStatusChange }: InlineStatusSelectorProps) {
  const [open, setOpen] = useState(false);
  const current = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all hover:opacity-80 whitespace-nowrap',
            current.bg, current.text
          )}
        >
          {current.label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="start" dir="rtl">
        <div className="flex flex-col gap-0.5">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={cn(
                'w-full px-3 py-1.5 rounded text-xs font-semibold text-start transition-all',
                opt.bg, opt.text,
                status === opt.value && 'ring-2 ring-primary ring-offset-1'
              )}
              onClick={() => {
                onStatusChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
