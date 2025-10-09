import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { DataTable, Column } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { adminTranslations } from "@/constants/adminTranslations";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  old_values: any;
  new_values: any;
  user_agent: string | null;
  timestamp: string;
}

const AuditLog = () => {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsDialog(true);
  };

  const actionBadgeVariant = (action: string) => {
    if (action.includes('delete')) return 'destructive';
    if (action.includes('create')) return 'default';
    if (action.includes('update')) return 'secondary';
    return 'outline';
  };

  const getActionText = (action: string) => {
    if (action === 'create') return adminTranslations.auditLog.create;
    if (action === 'update') return adminTranslations.auditLog.update;
    if (action === 'delete') return adminTranslations.auditLog.delete;
    if (action === 'archive') return adminTranslations.auditLog.archive;
    if (action === 'restore') return adminTranslations.auditLog.restore;
    if (action === 'update_roles') return adminTranslations.auditLog.update_roles;
    return action;
  };

  const columns: Column<AuditLog>[] = [
    {
      header: adminTranslations.auditLog.timestamp,
      cell: (item) => new Date(item.timestamp).toLocaleString('he-IL'),
    },
    {
      header: adminTranslations.auditLog.action,
      cell: (item) => (
        <Badge variant={actionBadgeVariant(item.action)}>
          {getActionText(item.action)}
        </Badge>
      ),
    },
    { header: adminTranslations.auditLog.targetTable, accessorKey: "target_table" },
    {
      header: adminTranslations.auditLog.targetId,
      cell: (item) => (
        <span className="font-mono text-xs">
          {item.target_id ? item.target_id.substring(0, 8) + '...' : adminTranslations.suppliers.na}
        </span>
      ),
    },
    {
      header: adminTranslations.auditLog.adminId,
      cell: (item) => (
        <span className="font-mono text-xs">
          {item.admin_id.substring(0, 8)}...
        </span>
      ),
    },
    {
      header: adminTranslations.auditLog.details,
      cell: (item) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleViewDetails(item)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{adminTranslations.auditLog.title}</h1>
          <p className="text-muted-foreground mt-1">
            {adminTranslations.auditLog.description}
          </p>
        </div>

        <DataTable data={logs} columns={columns} />

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{adminTranslations.auditLog.detailsTitle}</DialogTitle>
              <DialogDescription>
                {adminTranslations.auditLog.detailsDescription}
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">{adminTranslations.auditLog.actionDetails}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{adminTranslations.auditLog.action}:</span>{" "}
                      {getActionText(selectedLog.action)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{adminTranslations.auditLog.table}:</span>{" "}
                      {selectedLog.target_table}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{adminTranslations.auditLog.targetId}:</span>{" "}
                      <span className="font-mono text-xs">{selectedLog.target_id || adminTranslations.suppliers.na}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{adminTranslations.auditLog.timestamp}:</span>{" "}
                      {new Date(selectedLog.timestamp).toLocaleString('he-IL')}
                    </div>
                  </div>
                </div>

                {selectedLog.old_values && (
                  <div>
                    <h3 className="font-semibold mb-2">{adminTranslations.auditLog.oldValues}</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div>
                    <h3 className="font-semibold mb-2">{adminTranslations.auditLog.newValues}</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <h3 className="font-semibold mb-2">{adminTranslations.auditLog.userAgent}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedLog.user_agent}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AuditLog;
