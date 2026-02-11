import { useMemo, useRef } from 'react';
import { PROJECT_PHASES } from '@/constants/project';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProjectOption } from '@/hooks/useAllProjectsTasks';
import { cn } from '@/lib/utils';

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

  // Count projects per phase for "all" mode
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
    <div className="w-full bg-card border rounded-lg p-3">
      <div ref={scrollRef} className="overflow-x-auto pb-2">
        <div className="flex items-start gap-0 min-w-max" dir="rtl">
          <TooltipProvider delayDuration={200}>
            {PROJECT_PHASES.map((phase, idx) => {
              const isCompleted = mode === 'single' && phaseIndex >= 0 && idx < phaseIndex;
              const isCurrent = mode === 'single' && idx === phaseIndex;
              const isFuture = mode === 'single' && (phaseIndex < 0 || idx > phaseIndex);
              const count = phaseCounts[phase]?.count || 0;
              const names = phaseCounts[phase]?.names || [];

              return (
                <div key={phase} className="flex items-start">
                  <div className="flex flex-col items-center w-20 md:w-24">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all cursor-default',
                            mode === 'all' && count > 0
                              ? 'bg-primary text-primary-foreground border-primary'
                              : mode === 'all'
                                ? 'bg-muted text-muted-foreground border-border'
                                : isCompleted
                                  ? 'bg-green-500 text-white border-green-600'
                                  : isCurrent
                                    ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30 ring-offset-2'
                                    : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          {mode === 'all' ? (count > 0 ? count : '') : isCompleted ? '✓' : idx + 1}
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
                    <span
                      className={cn(
                        'text-[10px] md:text-xs mt-1.5 text-center leading-tight max-w-[72px] md:max-w-[88px]',
                        isCurrent ? 'font-bold text-primary' : isCompleted ? 'text-green-600 font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {phase}
                    </span>
                  </div>
                  {idx < PROJECT_PHASES.length - 1 && (
                    <div className="flex items-center mt-4 md:mt-[18px]">
                      <div
                        className={cn(
                          'w-4 md:w-6 h-0.5',
                          mode === 'single' && phaseIndex >= 0 && idx < phaseIndex
                            ? 'bg-green-500'
                            : 'bg-border'
                        )}
                      />
                    </div>
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
