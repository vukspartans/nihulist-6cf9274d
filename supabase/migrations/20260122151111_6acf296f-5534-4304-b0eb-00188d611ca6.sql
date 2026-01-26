-- Fix Version 2 line_items: Apply negotiated prices from the resolved session
UPDATE proposal_versions
SET line_items = jsonb_build_array(
  jsonb_build_object(
    'item_id', '96f65614-358c-4d85-a017-cc21d70818de',
    'description', 'הצעת המחיר לתכנון אינסטלציה',
    'quantity', 74,
    'unit', 'unit',
    'unit_price', 945.99,
    'total', 70004,
    'is_entrepreneur_defined', true,
    'is_optional', false,
    'negotiated', true
  ),
  jsonb_build_object(
    'item_id', '0ed2ab14-b7c5-4de6-90a5-7e2cd6e53ec3',
    'description', 'הצעת המחיר לתכנון אינסטלציה ב-REVIT',
    'quantity', 1,
    'unit', 'percentage',
    'unit_price', 0,
    'total', 0,
    'is_entrepreneur_defined', true,
    'is_optional', false,
    'comment', 'כולל',
    'negotiated', true
  ),
  jsonb_build_object(
    'item_id', '02bdeec8-01e7-40ee-85e0-7a503c64ff11',
    'description', 'תכנון חוזר במסגרת שינוי דיירים בדירה רגילה (4-5 חדרים):',
    'quantity', 1,
    'unit', 'lump_sum',
    'unit_price', 0,
    'is_entrepreneur_defined', true,
    'is_optional', true
  ),
  jsonb_build_object(
    'item_id', '12c0499d-ceb0-4fc4-8595-797b07f139bb',
    'description', 'הכנת סופרפוזיציה במודל 360BIM',
    'quantity', 1,
    'unit', 'lump_sum',
    'unit_price', 0,
    'is_entrepreneur_defined', true,
    'is_optional', true
  ),
  jsonb_build_object(
    'item_id', '077000eb-bd17-45d4-97a5-302436607557',
    'description', 'תכנון חוזר במסגרת שינוי דיירים בדירה מיוחדת',
    'quantity', 1,
    'unit', 'lump_sum',
    'unit_price', 0,
    'is_entrepreneur_defined', true,
    'is_optional', true
  ),
  jsonb_build_object(
    'item_id', 'd0bad179-07e8-4cad-8add-4090932bbf4c',
    'description', 'עלות כל ביקור נוסף באתר מעבר ל5 ביקורים',
    'quantity', 1,
    'unit', 'lump_sum',
    'unit_price', 0,
    'is_entrepreneur_defined', true,
    'is_optional', true
  ),
  jsonb_build_object(
    'description', 'תכנון חוזר שעתי',
    'quantity', 1,
    'unit', 'hourly',
    'unit_price', 220,
    'is_entrepreneur_defined', false,
    'is_optional', true
  ),
  jsonb_build_object(
    'description', 'תכנון חוזר יומי',
    'quantity', 1,
    'unit', 'per_consultant',
    'unit_price', 1250,
    'is_entrepreneur_defined', false,
    'is_optional', true
  )
)
WHERE proposal_id = 'ce3663bc-2791-4937-8a8a-d8bd8f1ef7ea'
  AND version_number = 2;

-- Update the main proposal's fee_line_items (without updated_at)
UPDATE proposals
SET fee_line_items = (
  SELECT line_items FROM proposal_versions 
  WHERE proposal_id = 'ce3663bc-2791-4937-8a8a-d8bd8f1ef7ea' 
    AND version_number = 2
)
WHERE id = 'ce3663bc-2791-4937-8a8a-d8bd8f1ef7ea';