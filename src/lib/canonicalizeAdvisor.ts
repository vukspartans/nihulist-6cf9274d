/**
 * Canonicalize advisor names to ensure consistency across the application.
 * This function removes noise (leading icons, asterisks, Unicode marks, extra spaces)
 * and normalizes synonyms/variations to a single canonical form.
 */
export const canonicalizeAdvisor = (raw: string): string => {
  if (!raw) return '';
  
  // Remove Unicode direction marks and trim
  let s = raw.replace(/[\u200e\u200f]/g, '').trim();
  
  // Remove leading symbols (☐, ✔, ✅, •, -, >, arrows, *) and trailing symbols (*, :, >)
  s = s.replace(/^[\s☐✔✅•\-\u2013\u2014>\*]+/, '').replace(/[*:>]+$/, '').trim();
  
  // Collapse multiple spaces
  s = s.replace(/\s{2,}/g, ' ');
  
  // Normalize common abbreviations
  s = s.replace(/^עו["'״]?ד\s+מקרקעין$/u, 'עורך דין מקרקעין');
  
  // Define explicit mapping for variations to canonical names
  const canonicalMap: Record<string, string> = {
    'אדריכל ראשי': 'אדריכל',
    'אדריכלית': 'אדריכל',
    'אדריכל/ית': 'אדריכל',
    'אדריכלית ראשית': 'אדריכל',
    'עורך/ת דין מקרקעין': 'עורך דין מקרקעין',
    'עורכת דין מקרקעין': 'עורך דין מקרקעין',
    'עו"ד מקרקעין': 'עורך דין מקרקעין',
    'עו״ד מקרקעין': 'עורך דין מקרקעין',
    // Map legacy names to new canonical names
    'יועץ אשפה': 'יועץ תברואה',
    'אדריכל נוף': 'אדריכל נוף ופיתוח',
    'יועץ פיתוח': 'אדריכל נוף ופיתוח',
  };
  
  // Return canonical form if matched, otherwise return cleaned string
  return canonicalMap[s] ?? s.replace(/\*+$/, '');
};
