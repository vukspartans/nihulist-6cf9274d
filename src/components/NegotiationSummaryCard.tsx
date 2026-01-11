import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, CheckCircle, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NegotiationSummary {
  id: string;
  status: string;
  proposal_id: string;
  created_at: string;
  responded_at: string | null;
  supplier_name: string;
  advisor_type: string | null;
  original_price: number;
  target_total: number | null;
}

interface NegotiationSummaryCardProps {
  projectId: string;
  onViewProposal?: (proposalId: string) => void;
}

export const NegotiationSummaryCard = ({ projectId, onViewProposal }: NegotiationSummaryCardProps) => {
  const [negotiations, setNegotiations] = useState<NegotiationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNegotiations();
  }, [projectId]);

  const fetchNegotiations = async () => {
    try {
      const { data, error } = await supabase
        .from('negotiation_sessions')
        .select(`
          id,
          status,
          proposal_id,
          created_at,
          responded_at,
          target_total,
          proposals!negotiation_sessions_proposal_id_fkey (
            supplier_name,
            price,
            rfp_invite:rfp_invite_id (
              advisor_type
            )
          )
        `)
        .eq('project_id', projectId)
        .in('status', ['awaiting_response', 'responded', 'open'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((n: any) => ({
        id: n.id,
        status: n.status,
        proposal_id: n.proposal_id,
        created_at: n.created_at,
        responded_at: n.responded_at,
        target_total: n.target_total,
        supplier_name: n.proposals?.supplier_name || 'יועץ',
        advisor_type: n.proposals?.rfp_invite?.advisor_type || null,
        original_price: n.proposals?.price || 0,
      }));

      setNegotiations(mapped);
    } catch (err) {
      console.error('Error fetching negotiations:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'awaiting_response':
        return { label: 'ממתין לתגובה', icon: Clock, variant: 'secondary' as const, color: 'text-amber-600' };
      case 'responded':
        return { label: 'התקבלה תגובה', icon: RefreshCw, variant: 'default' as const, color: 'text-green-600' };
      case 'open':
        return { label: 'פתוח', icon: MessageSquare, variant: 'outline' as const, color: 'text-blue-600' };
      default:
        return { label: status, icon: MessageSquare, variant: 'outline' as const, color: 'text-muted-foreground' };
    }
  };

  if (loading) {
    return null;
  }

  if (negotiations.length === 0) {
    return null;
  }

  const awaitingCount = negotiations.filter(n => n.status === 'awaiting_response').length;
  const respondedCount = negotiations.filter(n => n.status === 'responded').length;

  return (
    <Card dir="rtl" className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          משא ומתן פעיל
          <Badge variant="secondary" className="mr-auto">
            {negotiations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary stats */}
        <div className="flex gap-4 text-sm">
          {awaitingCount > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <Clock className="w-4 h-4" />
              <span>{awaitingCount} ממתינים</span>
            </div>
          )}
          {respondedCount > 0 && (
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>{respondedCount} הגיבו</span>
            </div>
          )}
        </div>

        {/* Negotiation list */}
        <div className="space-y-2">
          {negotiations.map((neg) => {
            const statusInfo = getStatusInfo(neg.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div 
                key={neg.id} 
                className="flex items-center justify-between p-2.5 bg-background rounded-lg border"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusInfo.color}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{neg.supplier_name}</p>
                    {neg.advisor_type && (
                      <p className="text-xs text-muted-foreground truncate">{neg.advisor_type}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {neg.status === 'responded' && (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-300 text-xs">
                      הצעה מעודכנת
                    </Badge>
                  )}
                  {neg.status === 'awaiting_response' && (
                    <Badge variant="secondary" className="text-xs">
                      ממתין
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onViewProposal?.(neg.proposal_id)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
