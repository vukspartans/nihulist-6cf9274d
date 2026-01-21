import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ArrowDown, ArrowUp, Minus, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProposalVersion {
  id: string;
  version_number: number;
  price: number;
  timeline_days: number;
  scope_text?: string;
  terms?: string;
  change_reason?: string;
  created_at: string;
  line_items?: LineItem[];
}

interface LineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
  is_optional: boolean;
  category?: string;
}

interface VersionComparisonViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  supplierName?: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const VersionComparisonView: React.FC<VersionComparisonViewProps> = ({
  open,
  onOpenChange,
  proposalId,
  supplierName
}) => {
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersionA, setSelectedVersionA] = useState<number>(1);
  const [selectedVersionB, setSelectedVersionB] = useState<number | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
      if (!open || !proposalId) return;

      setLoading(true);
      try {
        // Fetch all versions
        const { data: versionsData, error: versionsError } = await supabase
          .from('proposal_versions')
          .select('*')
          .eq('proposal_id', proposalId)
          .order('version_number', { ascending: true });

        if (versionsError) throw versionsError;

        // Fetch line items for each version
        const { data: lineItems, error: lineItemsError } = await supabase
          .from('proposal_line_items')
          .select('*')
          .eq('proposal_id', proposalId)
          .order('display_order', { ascending: true });

        if (lineItemsError) throw lineItemsError;

        // Group line items by version
        const versionsWithItems = (versionsData || []).map(v => ({
          ...v,
          line_items: (lineItems || []).filter(li => li.version_number === v.version_number)
        }));

        setVersions(versionsWithItems);
        
        // Set default selections
        if (versionsWithItems.length >= 2) {
          setSelectedVersionA(1);
          setSelectedVersionB(versionsWithItems.length);
        } else if (versionsWithItems.length === 1) {
          setSelectedVersionA(1);
          setSelectedVersionB(null);
        }
      } catch (err) {
        console.error('Error fetching versions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [open, proposalId]);

  const versionA = versions.find(v => v.version_number === selectedVersionA);
  const versionB = selectedVersionB ? versions.find(v => v.version_number === selectedVersionB) : null;

  const getPriceDiff = () => {
    if (!versionA || !versionB) return null;
    const diff = versionB.price - versionA.price;
    const percent = ((diff / versionA.price) * 100).toFixed(1);
    return { diff, percent };
  };

  const priceDiff = getPriceDiff();

  const renderVersionCard = (version: ProposalVersion | undefined, label: string) => {
    if (!version) {
      return (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-base">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">בחר גרסה להשוואה</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {label}
              <Badge variant="outline">V{version.version_number}</Badge>
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {formatDate(version.created_at)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">מחיר</p>
              <p className="text-lg font-semibold">{formatCurrency(version.price)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">לו"ז</p>
              <p className="text-lg font-semibold">{version.timeline_days} ימים</p>
            </div>
          </div>

          {version.change_reason && (
            <div>
              <p className="text-xs text-muted-foreground">סיבת השינוי</p>
              <p className="text-sm">{version.change_reason}</p>
            </div>
          )}

          {version.line_items && version.line_items.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">פירוט פריטים</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {version.line_items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                    <span className={cn(item.is_optional && "text-muted-foreground")}>
                      {item.name}
                      {item.is_optional && <span className="text-xs mr-1">(אופציונלי)</span>}
                    </span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderDiffSummary = () => {
    if (!priceDiff || !versionA || !versionB) return null;

    const isDecrease = priceDiff.diff < 0;
    const Icon = isDecrease ? ArrowDown : priceDiff.diff > 0 ? ArrowUp : Minus;
    
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-4 rounded-lg",
        isDecrease ? "bg-green-50 text-green-700" : priceDiff.diff > 0 ? "bg-red-50 text-red-700" : "bg-muted"
      )}>
        <Icon className="w-6 h-6 mb-1" />
        <span className="font-bold text-lg">
          {isDecrease ? '' : '+'}{formatCurrency(priceDiff.diff)}
        </span>
        <span className="text-sm">
          ({isDecrease ? '' : '+'}{priceDiff.percent}%)
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <span>השוואת גרסאות</span>
            {supplierName && <Badge variant="secondary">{supplierName}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>אין גרסאות זמינות להשוואה</p>
          </div>
        ) : versions.length === 1 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">קיימת רק גרסה אחת של ההצעה</p>
            {renderVersionCard(versions[0], 'גרסה נוכחית')}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Version selectors */}
            <div className="flex items-center gap-4 justify-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">גרסה A:</span>
                <div className="flex gap-1">
                  {versions.map(v => (
                    <Button
                      key={v.version_number}
                      size="sm"
                      variant={selectedVersionA === v.version_number ? "default" : "outline"}
                      onClick={() => setSelectedVersionA(v.version_number)}
                      disabled={selectedVersionB === v.version_number}
                    >
                      V{v.version_number}
                    </Button>
                  ))}
                </div>
              </div>
              
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">גרסה B:</span>
                <div className="flex gap-1">
                  {versions.map(v => (
                    <Button
                      key={v.version_number}
                      size="sm"
                      variant={selectedVersionB === v.version_number ? "default" : "outline"}
                      onClick={() => setSelectedVersionB(v.version_number)}
                      disabled={selectedVersionA === v.version_number}
                    >
                      V{v.version_number}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Diff summary */}
            {priceDiff && (
              <div className="flex justify-center">
                {renderDiffSummary()}
              </div>
            )}

            {/* Side by side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderVersionCard(versionA, 'גרסה A')}
              {renderVersionCard(versionB, 'גרסה B')}
            </div>

            {/* Line items diff table */}
            {versionA && versionB && versionA.line_items && versionB.line_items && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">השוואת פריטים</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-2 px-2">פריט</th>
                          <th className="text-left py-2 px-2">V{versionA.version_number}</th>
                          <th className="text-left py-2 px-2">V{versionB.version_number}</th>
                          <th className="text-left py-2 px-2">הפרש</th>
                        </tr>
                      </thead>
                      <tbody>
                        {versionA.line_items.map(itemA => {
                          const itemB = versionB.line_items?.find(
                            i => i.name === itemA.name || i.id === itemA.id
                          );
                          const diff = itemB ? itemB.total - itemA.total : 0;
                          const hasDiff = diff !== 0;

                          return (
                            <tr key={itemA.id} className={cn(
                              "border-b last:border-0",
                              hasDiff && (diff < 0 ? "bg-green-50/50" : "bg-red-50/50")
                            )}>
                              <td className="py-2 px-2">{itemA.name}</td>
                              <td className="py-2 px-2 text-left">{formatCurrency(itemA.total)}</td>
                              <td className="py-2 px-2 text-left">
                                {itemB ? formatCurrency(itemB.total) : '-'}
                              </td>
                              <td className={cn(
                                "py-2 px-2 text-left font-medium",
                                diff < 0 ? "text-green-600" : diff > 0 ? "text-red-600" : ""
                              )}>
                                {hasDiff ? (
                                  <>
                                    {diff < 0 ? '' : '+'}{formatCurrency(diff)}
                                  </>
                                ) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VersionComparisonView;
