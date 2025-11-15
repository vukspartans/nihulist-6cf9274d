import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  completed: boolean;
}

interface ProposalProgressStepperProps {
  steps: Step[];
  className?: string;
}

export function ProposalProgressStepper({ steps, className }: ProposalProgressStepperProps) {
  return (
    <div className={cn("w-full py-6", className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border z-0" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary z-0 transition-all duration-500"
          style={{ 
            width: `${(steps.filter(s => s.completed).length / steps.length) * 100}%` 
          }}
        />
        
        {/* Steps */}
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
            <div 
              className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center bg-background transition-all duration-300",
                step.completed 
                  ? "border-primary bg-primary text-primary-foreground" 
                  : "border-border text-muted-foreground"
              )}
            >
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{step.id}</span>
              )}
            </div>
            <span 
              className={cn(
                "mt-2 text-xs text-center max-w-[100px] transition-colors",
                step.completed ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
