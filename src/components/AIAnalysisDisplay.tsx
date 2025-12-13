import { cn } from '@/lib/utils';

interface AIAnalysisDisplayProps {
  content: string;
  className?: string;
}

/**
 * Renders AI analysis content with proper markdown-like formatting:
 * - Headers (###) as bold sections
 * - Bullet points (• or -) as styled lists
 * - Emoji headers highlighted
 * - Recommendation badges color-coded (🟢/🟡/🔴)
 * - Warning sections styled differently
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
        <ul key={`list-${listKey++}`} className="space-y-1 mr-4 my-2">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-right">
              <span className="text-primary mt-1.5 text-xs">●</span>
              <span className="flex-1">{item}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const getRecommendationStyle = (line: string) => {
    if (line.includes('🟢')) return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200';
    if (line.includes('🟡')) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200';
    if (line.includes('🔴')) return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
    return '';
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines but flush list first
    if (!trimmedLine) {
      flushList();
      return;
    }

    // Handle headers (### or **)
    if (trimmedLine.startsWith('###') || trimmedLine.startsWith('##')) {
      flushList();
      const headerText = trimmedLine.replace(/^#{2,3}\s*/, '').replace(/\*\*/g, '');
      elements.push(
        <h4 key={`h-${index}`} className="font-semibold text-base mt-4 mb-2 text-right flex items-center gap-2 flex-row-reverse">
          {headerText}
        </h4>
      );
      return;
    }

    // Handle bold headers with **
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      flushList();
      const headerText = trimmedLine.replace(/\*\*/g, '');
      elements.push(
        <h4 key={`h-${index}`} className="font-semibold text-base mt-4 mb-2 text-right">
          {headerText}
        </h4>
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
        <div key={`num-${index}`} className="flex items-start gap-2 my-1 text-right flex-row-reverse">
          <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0">
            {num}
          </span>
          <span className="flex-1 text-right">{rest.join('. ')}</span>
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
            "p-3 rounded-lg border my-3 text-right font-medium",
            recommendationStyle
          )}
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
        <div key={`warn-${index}`} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-3 rounded-lg my-2 text-right text-orange-800 dark:text-orange-200">
          {trimmedLine}
        </div>
      );
      return;
    }

    // Handle metadata footer (📋 or ⏱️)
    if (trimmedLine.startsWith('📋') || trimmedLine.startsWith('⏱️')) {
      flushList();
      elements.push(
        <p key={`meta-${index}`} className="text-xs text-muted-foreground mt-4 pt-2 border-t text-right">
          {trimmedLine}
        </p>
      );
      return;
    }

    // Handle header-like lines with emojis (📄, 🔍, etc.)
    if (/^[📋📄🔍📐⚖️👥✅💡💰📅🔑⚠️]/.test(trimmedLine)) {
      flushList();
      elements.push(
        <h4 key={`emoji-h-${index}`} className="font-semibold text-base mt-4 mb-2 text-right">
          {trimmedLine}
        </h4>
      );
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${index}`} className="text-right leading-relaxed my-1">
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
