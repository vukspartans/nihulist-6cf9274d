import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  MessageSquare, 
  Check, 
  X, 
  Clock, 
  Send, 
  Reply, 
  ChevronDown,
  FileText,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NegotiationEvent {
  id: string;
  type: 'session_created' | 'response_submitted' | 'approved' | 'rejected' | 'cancelled' | 'comment';
  date: string;
  title: string;
  description?: string;
  actor?: string;
  metadata?: {
    target_total?: number;
    target_reduction_percent?: number;
    response_price?: number;
    message?: string;
  };
}

interface NegotiationTimelineProps {
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

const getEventIcon = (type: NegotiationEvent['type']) => {
  switch (type) {
    case 'session_created':
      return <Send className="w-4 h-4" />;
    case 'response_submitted':
      return <Reply className="w-4 h-4" />;
    case 'approved':
      return <Check className="w-4 h-4" />;
    case 'rejected':
      return <X className="w-4 h-4" />;
    case 'cancelled':
      return <X className="w-4 h-4" />;
    case 'comment':
      return <MessageSquare className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getEventColor = (type: NegotiationEvent['type']) => {
  switch (type) {
    case 'session_created':
      return 'bg-blue-500 text-white';
    case 'response_submitted':
      return 'bg-purple-500 text-white';
    case 'approved':
      return 'bg-green-500 text-white';
    case 'rejected':
      return 'bg-red-500 text-white';
    case 'cancelled':
      return 'bg-gray-500 text-white';
    case 'comment':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'open':
      return <Badge variant="outline">פתוח</Badge>;
    case 'awaiting_response':
      return <Badge className="bg-yellow-100 text-yellow-800">ממתין לתגובה</Badge>;
    case 'responded':
      return <Badge className="bg-blue-100 text-blue-800">נענה</Badge>;
    case 'resolved':
      return <Badge className="bg-green-100 text-green-800">הושלם</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">בוטל</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const NegotiationTimeline: React.FC<NegotiationTimelineProps> = ({
  open,
  onOpenChange,
  proposalId,
  supplierName
}) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [events, setEvents] = useState<NegotiationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTimeline = async () => {
      if (!open || !proposalId) return;

      setLoading(true);
      try {
        // Fetch all negotiation sessions for this proposal
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('negotiation_sessions')
          .select(`
            *,
            comments:negotiation_comments(*),
            line_items:line_item_negotiations(*)
          `)
          .eq('proposal_id', proposalId)
          .order('created_at', { ascending: true });

        if (sessionsError) throw sessionsError;

        setSessions(sessionsData || []);

        // Build timeline events
        const allEvents: NegotiationEvent[] = [];

        (sessionsData || []).forEach(session => {
          // Session created
          allEvents.push({
            id: `${session.id}-created`,
            type: 'session_created',
            date: session.created_at,
            title: 'בקשת משא ומתן נשלחה',
            description: session.global_comment || session.initiator_message,
            metadata: {
              target_total: session.target_total,
              target_reduction_percent: session.target_reduction_percent
            }
          });

          // Response submitted
          if (session.responded_at) {
            allEvents.push({
              id: `${session.id}-responded`,
              type: 'response_submitted',
              date: session.responded_at,
              title: 'התקבלה תגובה מהיועץ',
              description: session.consultant_response_message
            });
          }

          // Resolution
          if (session.resolved_at) {
            allEvents.push({
              id: `${session.id}-resolved`,
              type: session.status === 'cancelled' ? 'cancelled' : 'approved',
              date: session.resolved_at,
              title: session.status === 'cancelled' ? 'משא ומתן בוטל' : 'משא ומתן הושלם'
            });
          }

          // Comments
          (session.comments || []).forEach((comment: any) => {
            allEvents.push({
              id: comment.id,
              type: 'comment',
              date: comment.created_at,
              title: comment.author_type === 'initiator' ? 'הערה מהיזם' : 'הערה מהיועץ',
              description: comment.content,
              metadata: {
                message: comment.content
              }
            });
          });
        });

        // Sort by date
        allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(allEvents);

        // Expand the latest session by default
        if (sessionsData && sessionsData.length > 0) {
          setExpandedSessions(new Set([sessionsData[sessionsData.length - 1].id]));
        }
      } catch (err) {
        console.error('Error fetching timeline:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [open, proposalId]);

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span>היסטוריית משא ומתן</span>
            {supplierName && <Badge variant="secondary">{supplierName}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>לא קיימת היסטוריית משא ומתן עבור הצעה זו</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">סה"כ סבבי משא ומתן:</span>
                    <Badge variant="secondary">{sessions.length}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">הודעות:</span>
                    <Badge variant="secondary">
                      {sessions.reduce((acc, s) => acc + (s.comments?.length || 0), 0)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sessions accordion */}
            <div className="space-y-2">
              {sessions.map((session, index) => (
                <Collapsible
                  key={session.id}
                  open={expandedSessions.has(session.id)}
                  onOpenChange={() => toggleSession(session.id)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-4 h-auto"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            getEventColor('session_created')
                          )}>
                            {index + 1}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">סבב משא ומתן #{index + 1}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(session.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(session.status)}
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform",
                            expandedSessions.has(session.id) && "rotate-180"
                          )} />
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        {/* Timeline within session */}
                        <div className="relative border-r-2 border-border mr-4 pr-6 space-y-4">
                          {/* Request sent */}
                          <div className="relative">
                            <div className={cn(
                              "absolute -right-9 w-6 h-6 rounded-full flex items-center justify-center",
                              getEventColor('session_created')
                            )}>
                              {getEventIcon('session_created')}
                            </div>
                            <div>
                              <p className="font-medium text-sm">בקשה נשלחה</p>
                              {session.target_reduction_percent && (
                                <p className="text-sm text-muted-foreground">
                                  יעד הפחתה: {session.target_reduction_percent}%
                                </p>
                              )}
                              {session.target_total && (
                                <p className="text-sm text-muted-foreground">
                                  יעד מחיר: {formatCurrency(session.target_total)}
                                </p>
                              )}
                              {session.global_comment && (
                                <p className="text-sm mt-1 p-2 bg-muted rounded">
                                  {session.global_comment}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Response */}
                          {session.responded_at && (
                            <div className="relative">
                              <div className={cn(
                                "absolute -right-9 w-6 h-6 rounded-full flex items-center justify-center",
                                getEventColor('response_submitted')
                              )}>
                                {getEventIcon('response_submitted')}
                              </div>
                              <div>
                                <p className="font-medium text-sm">תגובה התקבלה</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(session.responded_at)}
                                </p>
                                {session.consultant_response_message && (
                                  <p className="text-sm mt-1 p-2 bg-muted rounded">
                                    {session.consultant_response_message}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Comments */}
                          {session.comments && session.comments.length > 0 && (
                            <div className="space-y-2">
                              {session.comments.map((comment: any) => (
                                <div key={comment.id} className="relative">
                                  <div className={cn(
                                    "absolute -right-9 w-6 h-6 rounded-full flex items-center justify-center",
                                    getEventColor('comment')
                                  )}>
                                    {getEventIcon('comment')}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {comment.author_type === 'initiator' ? 'הערת יזם' : 'הערת יועץ'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(comment.created_at)}
                                    </p>
                                    <p className="text-sm mt-1 p-2 bg-muted rounded">
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Resolution */}
                          {session.resolved_at && (
                            <div className="relative">
                              <div className={cn(
                                "absolute -right-9 w-6 h-6 rounded-full flex items-center justify-center",
                                getEventColor(session.status === 'cancelled' ? 'cancelled' : 'approved')
                              )}>
                                {getEventIcon(session.status === 'cancelled' ? 'cancelled' : 'approved')}
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {session.status === 'cancelled' ? 'בוטל' : 'הושלם'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(session.resolved_at)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NegotiationTimeline;
