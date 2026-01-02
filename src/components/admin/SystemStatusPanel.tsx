import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, Brain, Mail, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latency_ms?: number;
  provider?: string;
  message?: string;
}

interface HealthCheckResponse {
  database: ServiceStatus;
  ai: ServiceStatus;
  email: ServiceStatus;
  storage: ServiceStatus;
  checked_at: string;
}

const statusConfig = {
  healthy: {
    color: 'bg-emerald-500',
    label: 'תקין',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  degraded: {
    color: 'bg-amber-500',
    label: 'בדיקה נדרשת',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
  down: {
    color: 'bg-red-500',
    label: 'לא זמין',
    textColor: 'text-red-600 dark:text-red-400',
  },
  unknown: {
    color: 'bg-muted',
    label: 'לא ידוע',
    textColor: 'text-muted-foreground',
  },
};

const ServiceCard = ({ 
  icon: Icon, 
  name, 
  status, 
  details 
}: { 
  icon: React.ElementType; 
  name: string; 
  status: ServiceStatus; 
  details?: string;
}) => {
  const config = statusConfig[status.status];
  
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/30 border border-border/50 min-w-[120px]">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full animate-pulse", config.color)} />
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <span className="font-medium text-sm">{name}</span>
      <span className={cn("text-xs font-medium", config.textColor)}>
        {config.label}
      </span>
      {details && (
        <span className="text-xs text-muted-foreground">{details}</span>
      )}
    </div>
  );
};

export const SystemStatusPanel = () => {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['system-health'],
    queryFn: async (): Promise<HealthCheckResponse> => {
      const { data, error } = await supabase.functions.invoke('system-health-check');
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    staleTime: 30000,
  });

  const defaultStatus: ServiceStatus = { status: 'unknown' };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">סטטוס מערכת</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            רענן
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
          <ServiceCard
            icon={Database}
            name="Database"
            status={data?.database ?? defaultStatus}
            details={data?.database?.latency_ms ? `${data.database.latency_ms}ms` : undefined}
          />
          <ServiceCard
            icon={Brain}
            name="AI"
            status={data?.ai ?? defaultStatus}
            details={data?.ai?.provider}
          />
          <ServiceCard
            icon={Mail}
            name="Email"
            status={data?.email ?? defaultStatus}
            details={data?.email?.provider}
          />
          <ServiceCard
            icon={HardDrive}
            name="Storage"
            status={data?.storage ?? defaultStatus}
            details={data?.storage?.message}
          />
        </div>
        
        {dataUpdatedAt && (
          <p className="text-xs text-muted-foreground mt-4 text-center sm:text-right">
            עדכון אחרון: {format(new Date(dataUpdatedAt), 'HH:mm:ss', { locale: he })}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
