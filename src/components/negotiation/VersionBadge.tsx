import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VersionBadgeProps {
  currentVersion: number;
  hasActiveNegotiation?: boolean;
  status?: string;
  onClick?: () => void;
  className?: string;
}

export const VersionBadge = ({
  currentVersion,
  hasActiveNegotiation = false,
  status,
  onClick,
  className,
}: VersionBadgeProps) => {
  const getVariant = () => {
    if (hasActiveNegotiation) return "secondary";
    if (status === "accepted") return "default";
    if (currentVersion > 1) return "outline";
    return "secondary";
  };

  const getLabel = () => {
    if (hasActiveNegotiation) {
      return `גרסה ${currentVersion} - ממתין`;
    }
    if (currentVersion > 1) {
      return `גרסה ${currentVersion} ✓`;
    }
    return `גרסה ${currentVersion}`;
  };

  const getTooltip = () => {
    if (hasActiveNegotiation) {
      return "משא ומתן פעיל - ממתין לתגובת היועץ";
    }
    if (currentVersion > 1) {
      return `הצעה עודכנה ${currentVersion - 1} פעמים`;
    }
    return "הצעה מקורית";
  };

  const badge = (
    <Badge
      variant={getVariant()}
      className={cn(
        "cursor-pointer transition-colors",
        hasActiveNegotiation && "bg-amber-100 text-amber-800 border-amber-300 animate-pulse",
        currentVersion > 1 && !hasActiveNegotiation && "bg-green-100 text-green-800 border-green-300",
        className
      )}
      onClick={onClick}
    >
      {getLabel()}
    </Badge>
  );

  if (onClick) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p>{getTooltip()}</p>
          <p className="text-xs text-muted-foreground">לחץ לצפייה בהיסטוריית גרסאות</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{getTooltip()}</TooltipContent>
    </Tooltip>
  );
};
