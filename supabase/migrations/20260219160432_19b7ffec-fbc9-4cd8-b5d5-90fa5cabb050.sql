-- Normalize "אדריכל נוף" -> "אדריכל נוף ופיתוח"
UPDATE advisors
SET expertise = array_replace(expertise, 'אדריכל נוף', 'אדריכל נוף ופיתוח')
WHERE 'אדריכל נוף' = ANY(expertise);

-- Normalize "יועץ פיתוח" -> "אדריכל נוף ופיתוח"
UPDATE advisors
SET expertise = array_replace(expertise, 'יועץ פיתוח', 'אדריכל נוף ופיתוח')
WHERE 'יועץ פיתוח' = ANY(expertise);

-- Normalize "יועץ אשפה" -> "יועץ תברואה"
UPDATE advisors
SET expertise = array_replace(expertise, 'יועץ אשפה', 'יועץ תברואה')
WHERE 'יועץ אשפה' = ANY(expertise);

-- Remove duplicates that may result from replacements
UPDATE advisors
SET expertise = (
  SELECT array_agg(DISTINCT e ORDER BY e)
  FROM unnest(expertise) AS e
)
WHERE array_length(expertise, 1) > 0;