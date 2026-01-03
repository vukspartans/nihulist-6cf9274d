import { cn } from '@/lib/utils';

interface AIAnalysisDisplayProps {
  content: string;
  className?: string;
}

/**
 * Renders AI analysis content with proper RTL markdown-like formatting:
 * - Headers (###) as bold sections with subtle backgrounds
 * - Bullet points (• or -) as styled lists with proper spacing
 * - Emoji headers highlighted
 * - Recommendation badges color-coded (🟢/🟡/🔴)
 * - Warning sections styled differently
 * - Clean visual hierarchy with section dividers
 */
export const AIAnalysisDisplay = ({ content, className }: AIAnalysisDisplayProps) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let currentList: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="space-y-2 my-3 pr-1" dir="rtl">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-right">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="flex-1 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const getRecommendationStyle = (line: string) => {
    if (line.includes('🟢')) return 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
    if (line.includes('🟡')) return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';
    if (line.includes('🔴')) return 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
    return '';
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines but flush list first
    if (!trimmedLine) {
      flushList();
      return;
    }

    // Handle headers (### or ##)
    if (trimmedLine.startsWith('###') || trimmedLine.startsWith('##')) {
      flushList();
      const headerText = trimmedLine.replace(/^#{2,3}\s*/, '').replace(/\*\*/g, '');
      elements.push(
        <div key={`h-${index}`} className="bg-muted/60 rounded-md px-3 py-2 mt-4 mb-2 first:mt-0" dir="rtl">
          <h4 className="font-semibold text-sm text-right text-foreground">
            {headerText}
          </h4>
        </div>
      );
      return;
    }

    // Handle bold headers with **
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      flushList();
      const headerText = trimmedLine.replace(/\*\*/g, '');
      elements.push(
        <div key={`h-${index}`} className="bg-muted/60 rounded-md px-3 py-2 mt-4 mb-2 first:mt-0" dir="rtl">
          <h4 className="font-semibold text-sm text-right text-foreground">
            {headerText}
          </h4>
        </div>
      );
      return;
    }

    // Handle bullet points (• or - or *)
    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      const bulletText = trimmedLine.replace(/^[•\-\*]\s*/, '');
      currentList.push(bulletText);
      return;
    }

    // Handle numbered lists
    if (/^\d+\.\s/.test(trimmedLine)) {
      flushList();
      const [num, ...rest] = trimmedLine.split(/\.\s/);
      elements.push(
        <div key={`num-${index}`} className="flex items-start gap-3 my-2 text-right" dir="rtl">
          <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {num}
          </span>
          <span className="flex-1 leading-relaxed pt-0.5">{rest.join('. ')}</span>
        </div>
      );
      return;
    }

    // Handle recommendation lines (🟢/🟡/🔴)
    const recommendationStyle = getRecommendationStyle(trimmedLine);
    if (recommendationStyle) {
      flushList();
      elements.push(
        <div 
          key={`rec-${index}`} 
          className={cn(
            "px-4 py-3 rounded-lg border my-3 text-right font-medium shadow-sm",
            recommendationStyle
          )}
          dir="rtl"
        >
          {trimmedLine}
        </div>
      );
      return;
    }

    // Handle warning sections (⚠️)
    if (trimmedLine.includes('⚠️')) {
      flushList();
      elements.push(
        <div 
          key={`warn-${index}`} 
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 rounded-lg my-3 text-right text-amber-800 dark:text-amber-200" 
          dir="rtl"
        >
          {trimmedLine}
        </div>
      );
      return;
    }

    // Handle metadata footer (📋 or ⏱️)
    if (trimmedLine.startsWith('📋') || trimmedLine.startsWith('⏱️')) {
      flushList();
      elements.push(
        <p key={`meta-${index}`} className="text-xs text-muted-foreground mt-4 pt-3 border-t text-right" dir="rtl">
          {trimmedLine}
        </p>
      );
      return;
    }

    // Handle header-like lines with emojis (📄, 🔍, etc.)
    if (/^[📋📄🔍📐⚖️👥✅💡💰📅🔑⚠️🎯📊💼🏆]/.test(trimmedLine)) {
      flushList();
      elements.push(
        <div key={`emoji-h-${index}`} className="bg-muted/60 rounded-md px-3 py-2 mt-4 mb-2 first:mt-0" dir="rtl">
          <h4 className="font-semibold text-sm text-right text-foreground">
            {trimmedLine}
          </h4>
        </div>
      );
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${index}`} className="text-right leading-relaxed my-2 text-muted-foreground" dir="rtl">
        {trimmedLine}
      </p>
    );
  });

  // Flush any remaining list items
  flushList();

  return (
    <div className={cn("space-y-1", className)} dir="rtl">
      {elements}
    </div>
  );
};
