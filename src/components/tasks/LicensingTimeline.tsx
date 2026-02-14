import { useMemo, useRef } from 'react';
import { PROJECT_PHASES } from '@/constants/project';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProjectOption } from '@/hooks/useAllProjectsTasks';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface LicensingTimelineProps {
  mode: 'all' | 'single';
  projects: ProjectOption[];
  selectedProjectId?: string | null;
}

export function LicensingTimeline({ mode, projects, selectedProjectId }: LicensingTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const phaseIndex = useMemo(() => {
    if (mode === 'single' && selectedProject?.phase) {
      return PROJECT_PHASES.indexOf(selectedProject.phase as any);
    }
    return -1;
  }, [mode, selectedProject]);

  const phaseCounts = useMemo(() => {
    if (mode !== 'all') return {};
    const counts: Record<string, { count: number; names: string[] }> = {};
    projects.forEach(p => {
      const ph = p.phase || 'לא צוין';
      if (!counts[ph]) counts[ph] = { count: 0, names: [] };
      counts[ph].count++;
      counts[ph].names.push(p.name);
    });
    return counts;
  }, [mode, projects]);

  return (
    <div className="w-full bg-card border rounded-lg p-4">
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="flex items-center gap-0 min-w-max" dir="rtl">
          <TooltipProvider delayDuration={200}>
            {PROJECT_PHASES.map((phase, idx) => {
              const isCompleted = mode === 'single' && phaseIndex >= 0 && idx < phaseIndex;
              const isCurrent = mode === 'single' && idx === phaseIndex;
              const isFuture = mode === 'single' && (phaseIndex < 0 || idx > phaseIndex);
              const count = phaseCounts[phase]?.count || 0;
              const names = phaseCounts[phase]?.names || [];

              return (
                <div key={phase} className="flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center">
                        {/* Circle */}
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all cursor-default',
                            mode === 'all' && count > 0
                              ? 'bg-primary text-primary-foreground border-primary'
                              : mode === 'all'
                                ? 'bg-muted text-muted-foreground border-border'
                                : isCompleted
                                  ? 'bg-emerald-500 text-white border-emerald-600'
                                  : isCurrent
                                    ? 'bg-amber-400 text-amber-900 border-amber-500 ring-2 ring-amber-300/50 ring-offset-1'
                                    : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {mode === 'all'
                            ? (count > 0 ? count : '')
                            : isCompleted
                              ? <Check className="w-4 h-4" />
                              : idx + 1
                          }
                        </div>
                        {/* Label */}
                        <span
                          className={cn(
                            'text-[10px] mt-1 text-center leading-tight max-w-[60px] md:max-w-[80px]',
                            isCurrent ? 'font-bold text-amber-600 dark:text-amber-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'
                          )}
                        >
                          {phase}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]" dir="rtl">
                      {mode === 'all' && count > 0 ? (
                        <div className="text-xs">
                          <div className="font-semibold mb-1">{phase} ({count})</div>
                          {names.slice(0, 5).map((n, i) => (
                            <div key={i}>• {n}</div>
                          ))}
                          {names.length > 5 && <div>...ועוד {names.length - 5}</div>}
                        </div>
                      ) : (
                        <span className="text-xs">{phase}</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                  {/* Connector line */}
                  {idx < PROJECT_PHASES.length - 1 && (
                    <div
                      className={cn(
                        'w-4 md:w-6 h-0.5 mb-5',
                        mode === 'single' && phaseIndex >= 0 && idx < phaseIndex
                          ? 'bg-emerald-500'
                          : 'bg-border'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
