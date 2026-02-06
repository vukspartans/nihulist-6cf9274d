import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportPDFButtonProps {
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  showText?: boolean;  // Show "ייצוא PDF" text, default true
}

export const ExportPDFButton = ({
  onClick,
  loading = false,
  disabled = false,
  className,
  showText = true,
}: ExportPDFButtonProps) => {
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
            className={cn("gap-2", className)}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {showText && (loading ? 'מייצא...' : 'ייצוא PDF')}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" dir="rtl">
          הורד את המסמך כקובץ PDF
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
