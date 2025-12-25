import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useNegotiation } from "@/hooks/useNegotiation";
import { useNegotiationComments } from "@/hooks/useNegotiationComments";
import type { NegotiationSessionWithDetails, UpdatedLineItem } from "@/types/negotiation";
import { RefreshCw, Send, FileText, ClipboardList, Calendar, CreditCard, ArrowLeft } from "lucide-react";

interface NegotiationResponseViewProps {
  sessionId: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

export const NegotiationResponseView = ({
  sessionId,
  onSuccess,
  onBack,
}: NegotiationResponseViewProps) => {
  const [session, setSession] = useState<NegotiationSessionWithDetails | null>(null);
  const [updatedLineItems, setUpdatedLineItems] = useState<UpdatedLineItem[]>([]);
  const [consultantMessage, setConsultantMessage] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);

  const { fetchNegotiationWithDetails, respondToNegotiation, loading } = useNegotiation();
  const { comments, commentTypeLabels, commentTypeIcons } = useNegotiationComments(sessionId);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoadingSession(true);
    const data = await fetchNegotiationWithDetails(sessionId);
    setSession(data);
    
    // Initialize line items with original prices
    if (data?.line_item_negotiations) {
      setUpdatedLineItems(
        data.line_item_negotiations.map((li) => ({
          line_item_id: li.line_item_id,
          consultant_response_price: li.initiator_target_price,
        }))
      );
    }
    setLoadingSession(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handlePriceChange = (lineItemId: string, price: number) => {
    setUpdatedLineItems((prev) =>
      prev.map((item) =>
        item.line_item_id === lineItemId
          ? { ...item, consultant_response_price: price }
          : item
      )
    );
  };

  const handleSubmit = async () => {
    const result = await respondToNegotiation({
      session_id: sessionId,
      consultant_message: consultantMessage || undefined,
      updated_line_items: updatedLineItems,
    });

    if (result) {
      onSuccess?.();
    }
  };

  const calculateNewTotal = (): number => {
    return updatedLineItems.reduce(
      (sum, item) => sum + item.consultant_response_price,
      0
    );
  };

  if (loadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">לא נמצא משא ומתן פעיל</p>
      </div>
    );
  }

  const originalTotal = session.proposal?.price || 0;
  const targetTotal = session.target_total || 0;
  const newTotal = calculateNewTotal();

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">בקשת עדכון הצעה</h2>
          <p className="text-muted-foreground">
            פרויקט: {session.project?.name}
          </p>
        </div>
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 me-2" />
            חזרה
          </Button>
        )}
      </div>

      {/* Initiator Comments */}
      {comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">הערות היזם</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200"
              >
                <span className="text-xl">
                  {commentTypeIcons[comment.comment_type]}
                </span>
                <div>
                  <p className="font-medium text-amber-800">
                    {commentTypeLabels[comment.comment_type]}
                  </p>
                  <p className="text-amber-700">{comment.content}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Global Comment */}
      {session.global_comment && (
        <Card>
          <CardContent className="pt-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">הודעה כללית:</p>
              <p>{session.global_comment}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      {session.line_item_negotiations && session.line_item_negotiations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">פריטים לעדכון</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                <span>פריט</span>
                <span className="text-center">מחיר מקורי</span>
                <span className="text-center">יעד היזם</span>
                <span className="text-center">הצעה חדשה שלי</span>
              </div>

              {session.line_item_negotiations.map((lineItem) => {
                const updatedItem = updatedLineItems.find(
                  (u) => u.line_item_id === lineItem.line_item_id
                );

                return (
                  <div
                    key={lineItem.id}
                    className="grid grid-cols-4 gap-4 items-center py-2"
                  >
                    <div>
                      <p className="font-medium">פריט #{lineItem.line_item_id.slice(0, 8)}</p>
                      {lineItem.initiator_note && (
                        <p className="text-xs text-muted-foreground">
                          {lineItem.initiator_note}
                        </p>
                      )}
                    </div>
                    <p className="text-center">
                      {formatCurrency(lineItem.original_price)}
                    </p>
                    <p className="text-center text-amber-600 font-medium">
                      {formatCurrency(lineItem.initiator_target_price)}
                    </p>
                    <Input
                      type="number"
                      value={updatedItem?.consultant_response_price || 0}
                      onChange={(e) =>
                        handlePriceChange(
                          lineItem.line_item_id,
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="text-center"
                    />
                  </div>
                );
              })}
            </div>

            <Separator className="my-4" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>סה״כ מקורי:</span>
                <span className="font-medium">{formatCurrency(originalTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>יעד היזם:</span>
                <span className="font-medium text-amber-600">
                  {formatCurrency(targetTotal)}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-medium">סה״כ הצעה חדשה:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(newTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">הודעה ליזם (אופציונלי)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="הוסף הערות או הסברים להצעה המעודכנת..."
            value={consultantMessage}
            onChange={(e) => setConsultantMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onBack}>
          ביטול
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin me-2" />
              שולח...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 me-2" />
              שלח הצעה מעודכנת
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
