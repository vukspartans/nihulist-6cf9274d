import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface DeadlineCountdownProps {
  deadline: string;
  className?: string;
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

export function DeadlineCountdown({ deadline, className = '' }: DeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  if (timeLeft.total <= 0) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>פג תוקף</AlertTitle>
        <AlertDescription>
          המועד להגשת הצעה עבר
        </AlertDescription>
      </Alert>
    );
  }

  const urgency = 
    timeLeft.total < 24 * 60 * 60 * 1000 ? 'destructive' : 
    timeLeft.total < 48 * 60 * 60 * 1000 ? 'default' : 
    'default';

  const isUrgent = timeLeft.total < 48 * 60 * 60 * 1000;
  const isCritical = timeLeft.total < 24 * 60 * 60 * 1000;

  return (
    <Alert variant={urgency} className={className}>
      <Clock className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {isUrgent && '⚠️'} זמן להגשה
        {isCritical && (
          <Badge variant="destructive" className="mr-2 animate-pulse">
            דחוף
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2" dir="rtl">
        <div className="flex gap-4 text-lg font-semibold">
          {timeLeft.total < 60 * 60 * 1000 && (
            <div className="text-center">
              <div className="text-2xl">{timeLeft.seconds}</div>
              <div className="text-xs text-muted-foreground">שניות</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-2xl">{timeLeft.minutes}</div>
            <div className="text-xs text-muted-foreground">דקות</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">{timeLeft.hours}</div>
            <div className="text-xs text-muted-foreground">שעות</div>
          </div>
          {timeLeft.days > 0 && (
            <div className="text-center">
              <div className="text-2xl">{timeLeft.days}</div>
              <div className="text-xs text-muted-foreground">ימים</div>
            </div>
          )}
        </div>
        <p className="text-sm mt-2 text-muted-foreground">
          ({formatDistanceToNow(new Date(deadline), { locale: he, addSuffix: true })})
        </p>
      </AlertDescription>
    </Alert>
  );
}
