import { PaymentStatusDefinition } from '@/types/paymentStatus';

interface ApprovalProgressStepperProps {
  statuses: PaymentStatusDefinition[];
  currentStepIndex: number;
}

export function ApprovalProgressStepper({
  statuses,
  currentStepIndex,
}: ApprovalProgressStepperProps) {
  const nonTerminal = statuses.filter((s) => !s.is_terminal);

  if (nonTerminal.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 mt-1.5" dir="rtl">
      {nonTerminal.map((step, i) => {
        const isCompleted = i < currentStepIndex;
        const isCurrent = i === currentStepIndex;

        return (
          <div key={step.code} className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full transition-all ${
                isCompleted
                  ? 'bg-primary'
                  : isCurrent
                    ? 'bg-primary/60 ring-2 ring-primary/30'
                    : 'bg-muted-foreground/20'
              }`}
              title={step.name}
            />
            {i < nonTerminal.length - 1 && (
              <div
                className={`w-3 h-px ${
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                }`}
              />
            )}
          </div>
        );
      })}
      <span className="text-[10px] text-muted-foreground mr-1">
        {currentStepIndex + 1}/{nonTerminal.length}
      </span>
    </div>
  );
}
