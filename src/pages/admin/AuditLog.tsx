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

  const columns: Column<AuditLog>[] = [
    {
      header: "Timestamp",
      cell: (item) => new Date(item.timestamp).toLocaleString(),
    },
    {
      header: "Action",
      cell: (item) => (
        <Badge variant={actionBadgeVariant(item.action)}>
          {item.action}
        </Badge>
      ),
    },
    { header: "Target Table", accessorKey: "target_table" },
    {
      header: "Target ID",
      cell: (item) => (
        <span className="font-mono text-xs">
          {item.target_id ? item.target_id.substring(0, 8) + '...' : 'N/A'}
        </span>
      ),
    },
    {
      header: "Admin ID",
      cell: (item) => (
        <span className="font-mono text-xs">
          {item.admin_id.substring(0, 8)}...
        </span>
      ),
    },
    {
      header: "Details",
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
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Complete trail of all admin actions (last 500 entries)
          </p>
        </div>

        <DataTable data={logs} columns={columns} />

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Log Details</DialogTitle>
              <DialogDescription>
                Complete information about this action
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Action Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Action:</span>{" "}
                      {selectedLog.action}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Table:</span>{" "}
                      {selectedLog.target_table}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Target ID:</span>{" "}
                      <span className="font-mono text-xs">{selectedLog.target_id || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Timestamp:</span>{" "}
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {selectedLog.old_values && (
                  <div>
                    <h3 className="font-semibold mb-2">Old Values</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_values && (
                  <div>
                    <h3 className="font-semibold mb-2">New Values</h3>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.user_agent && (
                  <div>
                    <h3 className="font-semibold mb-2">User Agent</h3>
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
