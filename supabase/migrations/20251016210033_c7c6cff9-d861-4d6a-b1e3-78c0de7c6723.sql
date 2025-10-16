-- Create function to canonicalize advisor names
CREATE OR REPLACE FUNCTION canonicalize_advisor_name(name TEXT) RETURNS TEXT AS $$
BEGIN
  -- Handle null or empty
  IF name IS NULL OR TRIM(name) = '' THEN
    RETURN name;
  END IF;
  
  -- Remove Unicode direction marks and trim
  name := TRIM(REGEXP_REPLACE(name, '[\u200E\u200F]', '', 'g'));
  
  -- Remove leading symbols (☐, ✔, ✅, •, -, >, arrows) and trailing symbols (*, :, >)
  name := TRIM(REGEXP_REPLACE(name, '^[\s☐✔✅•\-–—>]+', ''));
  name := TRIM(REGEXP_REPLACE(name, '[*:>]+$', ''));
  
  -- Collapse multiple spaces
  name := REGEXP_REPLACE(name, '\s{2,}', ' ', 'g');
  
  -- Normalize common abbreviations for עורך דין מקרקעין
  IF name ~ '^עו["''״]?ד\s+מקרקעין$' THEN
    RETURN 'עורך דין מקרקעין';
  END IF;
  
  -- Explicit mappings for variations
  CASE name
    WHEN 'אדריכל ראשי' THEN RETURN 'אדריכל';
    WHEN 'אדריכלית' THEN RETURN 'אדריכל';
    WHEN 'אדריכל/ית' THEN RETURN 'אדריכל';
    WHEN 'אדריכלית ראשית' THEN RETURN 'אדריכל';
    WHEN 'עורך/ת דין מקרקעין' THEN RETURN 'עורך דין מקרקעין';
    WHEN 'עורכת דין מקרקעין' THEN RETURN 'עורך דין מקרקעין';
    WHEN 'עו"ד מקרקעין' THEN RETURN 'עורך דין מקרקעין';
    WHEN 'עו״ד מקרקעין' THEN RETURN 'עורך דין מקרקעין';
    ELSE 
      -- Fallback: remove any remaining trailing asterisks
      RETURN REGEXP_REPLACE(name, '\*+$', '');
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all advisor expertise arrays to canonical form
UPDATE advisors
SET expertise = (
  SELECT array_agg(DISTINCT canonicalize_advisor_name(e))
  FROM unnest(expertise) AS e
  WHERE canonicalize_advisor_name(e) IS NOT NULL AND canonicalize_advisor_name(e) != ''
)
WHERE expertise IS NOT NULL AND array_length(expertise, 1) > 0;

-- Also update specialties if they exist
UPDATE advisors
SET specialties = (
  SELECT array_agg(DISTINCT canonicalize_advisor_name(s))
  FROM unnest(specialties) AS s
  WHERE canonicalize_advisor_name(s) IS NOT NULL AND canonicalize_advisor_name(s) != ''
)
WHERE specialties IS NOT NULL AND array_length(specialties, 1) > 0;