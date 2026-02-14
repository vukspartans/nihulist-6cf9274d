import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriorityStarsProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
}

export function PriorityStars({ value, onChange, max = 5, size = 14 }: PriorityStarsProps) {
  return (
    <div className="flex items-center gap-0" dir="ltr">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={!onChange}
            className={cn(
              'p-0 transition-colors',
              onChange ? 'cursor-pointer hover:text-amber-400' : 'cursor-default'
            )}
            onClick={() => onChange?.(i + 1 === value ? 0 : i + 1)}
          >
            <Star
              className={cn(
                filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
              )}
              style={{ width: size, height: size }}
            />
          </button>
        );
      })}
    </div>
  );
}
