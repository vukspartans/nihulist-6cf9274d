-- Add default fee item templates for אגרונום (Agronomist)
INSERT INTO default_fee_item_templates (advisor_specialty, description, unit, default_quantity, charge_type, is_optional, display_order)
VALUES 
  ('אגרונום', 'חוות דעת אגרונומית ראשונית', 'lump_sum', 1, 'one_time', false, 1),
  ('אגרונום', 'סקר עצים וצמחייה קיימת', 'lump_sum', 1, 'one_time', false, 2),
  ('אגרונום', 'הכנת תוכנית שימור עצים', 'lump_sum', 1, 'one_time', false, 3),
  ('אגרונום', 'ליווי מול רשויות (עירייה/ועדה)', 'hourly', 1, 'hourly', false, 4),
  ('אגרונום', 'פיקוח על העתקת עצים', 'per_visit', 1, 'per_visit', true, 5),
  ('אגרונום', 'הכנת דו"ח מסכם', 'lump_sum', 1, 'one_time', true, 6);