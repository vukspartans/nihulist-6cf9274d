import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, FileText, MessageSquare, ArrowLeftRight, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export interface NegotiationStep {
  date: string;
  label: string;
  type: 'original_offer' | 'change_request' | 'updated_offer';
  version?: number;
  status?: string;
  viewData: {
    type: 'proposal' | 'negotiation_session' | 'version';
    id: string;
  };
}

interface NegotiationStepsTimelineProps {
  steps: NegotiationStep[];
  onViewStep: (step: NegotiationStep) => void;
  compact?: boolean;
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd/MM/yyyy', { locale: he });
  } catch {
    return '-';
  }
};

const getStepIcon = (type: NegotiationStep['type']) => {
  switch (type) {
    case 'original_offer':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'change_request':
      return <MessageSquare className="h-4 w-4 text-amber-600" />;
    case 'updated_offer':
      return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getStepBgColor = (type: NegotiationStep['type']) => {
  switch (type) {
    case 'original_offer':
      return 'bg-muted/30';
    case 'change_request':
      return 'bg-amber-50 dark:bg-amber-950/20';
    case 'updated_offer':
      return 'bg-blue-50 dark:bg-blue-950/20';
    default:
      return 'bg-muted/30';
  }
};

const getStatusBadge = (status?: string) => {
  if (!status) return null;
  
  switch (status) {
    case 'accepted':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-300 gap-1">
          <CheckCircle className="h-3 w-3" />
          מאושרת
        </Badge>
      );
    case 'submitted':
    case 'resubmitted':
      return (
        <Badge variant="secondary" className="text-xs">
          הוגשה
        </Badge>
      );
    case 'negotiation_requested':
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
          משא ומתן
        </Badge>
      );
    default:
      return null;
  }
};

export const NegotiationStepsTimeline = ({
  steps,
  onViewStep,
  compact = false,
}: NegotiationStepsTimelineProps) => {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-1.5 ${compact ? 'py-2' : 'py-3 px-2'}`}>
      {steps.map((step, index) => (
        <div
          key={`${step.type}-${step.date}-${index}`}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${getStepBgColor(step.type)} transition-colors`}
        >
          {/* Step Icon */}
          <div className="flex-shrink-0">
            {getStepIcon(step.type)}
          </div>

          {/* Date */}
          <span className="text-sm text-muted-foreground font-mono min-w-[85px]">
            {formatDate(step.date)}
          </span>

          {/* Label */}
          <span className="flex-1 text-sm font-medium">
            {step.label}
          </span>

          {/* Status Badge */}
          {step.status && (
            <div className="flex-shrink-0">
              {getStatusBadge(step.status)}
            </div>
          )}

          {/* View Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 gap-1.5 text-primary hover:text-primary"
            onClick={() => onViewStep(step)}
          >
            <Eye className="h-3.5 w-3.5" />
            צפה
          </Button>
        </div>
      ))}
    </div>
  );
};
