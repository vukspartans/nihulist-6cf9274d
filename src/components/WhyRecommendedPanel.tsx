import { X, CheckCircle2, AlertTriangle, Quote, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WhyRecommendedPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: {
    id: string;
    supplier_name: string;
    evaluation_score?: number | null;
    evaluation_rank?: number | null;
    evaluation_result?: any;
    scope_text?: string | null;
    terms?: string | null;
  } | null;
}

// Hebrew translations for recommendation levels
const recommendationTranslations: Record<string, string> = {
  'Highly Recommended': 'מומלץ ביותר',
  'Recommended': 'מומלץ',
  'Review Required': 'נדרשת בחינה',
  'Not Recommended': 'לא מומלץ',
};

const getRecommendationBadgeColor = (level: string) => {
  switch (level) {
    case 'Highly Recommended':
      return 'bg-green-600';
    case 'Recommended':
      return 'bg-blue-600';
    case 'Review Required':
      return 'bg-yellow-600';
    case 'Not Recommended':
      return 'bg-red-600';
    default:
      return 'bg-gray-600';
  }
};

export const WhyRecommendedPanel = ({ open, onOpenChange, proposal }: WhyRecommendedPanelProps) => {
  if (!open || !proposal) return null;

  const evalData = proposal.evaluation_result;
  const strengths = evalData?.individual_analysis?.strengths || [];
  const weaknesses = evalData?.individual_analysis?.weaknesses || [];
  const redFlags = evalData?.flags?.red_flags || [];
  const dataCompleteness = evalData?.data_completeness || 0;
  const recommendationLevel = evalData?.recommendation_level || 'Review Required';
  const comparativeNotes = evalData?.comparative_notes;

  // Extract quotes from scope_text and terms
  const extractQuotes = () => {
    const text = `${proposal.scope_text || ''} ${proposal.terms || ''}`;
    
    if (!text.trim()) {
      return null;
    }

    // Try to find meaningful sentences (at least 20 characters)
    const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length >= 20);
    
    if (sentences.length === 0) {
      return null;
    }

    // Take first 2-3 sentences as quotes
    const selectedSentences = sentences.slice(0, 3);
    return selectedSentences.map(s => s.trim());
  };

  const quotes = extractQuotes();
  const topStrengths = strengths.slice(0, 3);
  const topRisks = [...weaknesses, ...redFlags].slice(0, 2);
  const confidencePercent = Math.round(dataCompleteness * 100);

  return (
    <div className="fixed inset-0 z-[60] flex" dir="rtl">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[55]" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-xl flex flex-col animate-in slide-in-from-right duration-300 z-[60]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">למה מומלץ?</h2>
              <p className="text-sm text-muted-foreground">{proposal.supplier_name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Recommendation Level */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">רמת המלצה</div>
              <Badge className={getRecommendationBadgeColor(recommendationLevel)}>
                {recommendationTranslations[recommendationLevel] || recommendationLevel}
              </Badge>
            </div>

            {/* Top 3 Reasons */}
            {topStrengths.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-lg">3 סיבות עיקריות</h3>
                </div>
                <ul className="space-y-2">
                  {topStrengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-1">•</span>
                      <span className="flex-1">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top 2 Risks */}
            {topRisks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">2 סיכונים עיקריים</h3>
                </div>
                <ul className="space-y-2">
                  {topRisks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-orange-600 mt-1">•</span>
                      <span className="flex-1">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Quotes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Quote className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg">ציטוטים מההצעה</h3>
              </div>
              {quotes && quotes.length > 0 ? (
                <div className="space-y-3">
                  {quotes.map((quote, idx) => (
                    <div key={idx} className="p-3 bg-muted rounded-lg border-r-4 border-blue-600">
                      <p className="text-sm italic">"{quote}"</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  אין ציטוטים ישירים זמינים; מבוסס על היקף העבודה והתנאים שסופקו.
                </div>
              )}
            </div>

            {/* Comparative Notes (if available) */}
            {comparativeNotes && (
              <div>
                <h3 className="font-semibold text-lg mb-3">השוואה להצעות אחרות</h3>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  {comparativeNotes}
                </div>
              </div>
            )}

            {/* Confidence Level */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">רמת ביטחון בנתונים</span>
                <span className="text-sm font-bold">{confidencePercent}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {confidencePercent >= 80 
                  ? 'נתונים מלאים - הערכה אמינה' 
                  : confidencePercent >= 60 
                  ? 'נתונים חלקיים - הערכה סבירה'
                  : 'נתונים חסרים - הערכה מוגבלת'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
