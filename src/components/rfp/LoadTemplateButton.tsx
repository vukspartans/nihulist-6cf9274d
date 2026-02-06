import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wand2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadTemplateButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const LoadTemplateButton = ({
  onClick,
  loading = false,
  disabled = false,
  className
}: LoadTemplateButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClick}
            disabled={loading || disabled}
            className={cn(
              "gap-2 bg-gradient-to-r from-primary/10 to-primary/5",
              "border-primary/30 hover:border-primary/50",
              "hover:from-primary/20 hover:to-primary/10",
              "text-primary font-medium transition-all",
              className
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            טען תבנית
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          dir="rtl" 
          className="max-w-[250px] text-right"
        >
          <p>לחיצה תטען תבנית מוכנה מראש שתסייע לך למלא את הפרטים במהירות וביעילות</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
