import { ArrowRight, Bell, PenTool, CheckSquare, Upload, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PaymentStatusDefinition } from '@/types/paymentStatus';

interface PaymentWorkflowPreviewProps {
  statuses: PaymentStatusDefinition[];
}

export function PaymentWorkflowPreview({ statuses }: PaymentWorkflowPreviewProps) {
  // Filter active statuses and sort by display_order
  const activeStatuses = statuses
    .filter(s => s.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  // Separate terminal and non-terminal statuses
  const flowStatuses = activeStatuses.filter(s => !s.is_terminal || s.code === 'paid');
  const terminalStatuses = activeStatuses.filter(s => s.is_terminal && s.code !== 'paid');

  const getSignatureIcon = (type: string) => {
    switch (type) {
      case 'drawn':
        return <PenTool className="w-3 h-3" />;
      case 'checkbox':
        return <CheckSquare className="w-3 h-3" />;
      case 'uploaded':
        return <Upload className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-muted/30 rounded-lg p-4 mb-6" dir="rtl">
      <h3 className="text-sm font-medium mb-3 text-muted-foreground text-right">תצוגה מקדימה של תהליך האישור</h3>
      
      <div className="flex flex-wrap flex-row-reverse items-center justify-end gap-2">
        {flowStatuses.map((status, index) => (
          <div key={status.id} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <Badge
                variant="outline"
                className="px-3 py-1.5 text-sm font-medium border-2"
                style={{ 
                  borderColor: status.color,
                  backgroundColor: `${status.color}15`,
                  color: status.color,
                }}
              >
                <span className="flex items-center gap-1.5">
                  {status.name}
                  {status.is_terminal && <Flag className="w-3 h-3" />}
                </span>
              </Badge>
              <div className="flex items-center gap-1 text-muted-foreground">
                {status.notify_on_enter && (
                  <Bell className="w-3 h-3" />
                )}
                {status.requires_signature && getSignatureIcon(status.signature_type)}
              </div>
            </div>
            
            {index < flowStatuses.length - 1 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {terminalStatuses.length > 0 && (
        <div className="mt-3 pt-3 border-t border-dashed flex flex-row-reverse items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground mr-2">סטטוסי סיום נוספים:</span>
          {terminalStatuses.map((status) => (
            <Badge
              key={status.id}
              variant="outline"
              className="px-2 py-1 text-xs border-dashed"
              style={{ 
                borderColor: status.color,
                color: status.color,
              }}
            >
              <span className="flex items-center gap-1">
                <Flag className="w-3 h-3" />
                {status.name}
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
