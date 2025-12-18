import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface DeadlineCountdownProps {
  deadline: string;
  className?: string;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(deadline: string): TimeLeft {
  const total = new Date(deadline).getTime() - Date.now();
  
  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total
  };
}

export function DeadlineCountdown({ deadline, className = '', compact = false }: DeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const isExpired = timeLeft.total <= 0;
  const isCritical = timeLeft.total < 24 * 60 * 60 * 1000;
  const isUrgent = timeLeft.total < 48 * 60 * 60 * 1000;

  if (isExpired) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive ${className}`}>
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium">פג תוקף - המועד להגשה עבר</span>
      </div>
    );
  }

  // Compact version - inline display
  if (compact) {
    const timeString = timeLeft.days > 0 
      ? `${timeLeft.days} ימים, ${timeLeft.hours} שעות`
      : timeLeft.hours > 0
        ? `${timeLeft.hours} שעות, ${timeLeft.minutes} דקות`
        : `${timeLeft.minutes} דקות`;

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Clock className={`h-4 w-4 flex-shrink-0 ${isCritical ? 'text-destructive' : isUrgent ? 'text-amber-500' : 'text-muted-foreground'}`} />
        <span className={`text-sm ${isCritical ? 'text-destructive font-medium' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {timeString}
        </span>
        {isCritical && (
          <Badge variant="destructive" className="text-xs animate-pulse">דחוף</Badge>
        )}
      </div>
    );
  }

  // Full version with countdown boxes
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isCritical ? 'border-destructive/50 bg-destructive/5' : 
      isUrgent ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : 
      'border-border bg-muted/30'
    } ${className}`} dir="rtl">
      <div className="flex items-center gap-2">
        <Clock className={`h-5 w-5 ${isCritical ? 'text-destructive' : isUrgent ? 'text-amber-500' : 'text-muted-foreground'}`} />
        <span className={`text-sm font-medium ${isCritical ? 'text-destructive' : ''}`}>
          זמן להגשה
        </span>
        {isCritical && (
          <Badge variant="destructive" className="text-xs animate-pulse">דחוף</Badge>
        )}
      </div>
      
      <div className="flex items-center gap-3 text-sm font-medium">
        {timeLeft.days > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold">{timeLeft.days}</span>
            <span className="text-xs text-muted-foreground">ימים</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold">{timeLeft.hours}</span>
          <span className="text-xs text-muted-foreground">שעות</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold">{timeLeft.minutes}</span>
          <span className="text-xs text-muted-foreground">דקות</span>
        </div>
        {timeLeft.total < 60 * 60 * 1000 && (
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold">{timeLeft.seconds}</span>
            <span className="text-xs text-muted-foreground">שניות</span>
          </div>
        )}
      </div>
    </div>
  );
}