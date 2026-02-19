
-- Clean up legacy orphan templates that have no category_id and no project_type
-- These are pre-hierarchy templates that now have proper categorized replacements

-- 1. Delete orphan fee item templates (65+ legacy rows with NULL category_id and NULL project_type)
DELETE FROM default_fee_item_templates
WHERE category_id IS NULL AND project_type IS NULL;

-- 2. Delete orphan service scope templates (2 legacy rows with NULL category_id)
DELETE FROM default_service_scope_templates
WHERE category_id IS NULL;

-- 3. Delete orphan milestone templates (5 legacy rows with NULL category_id and NULL advisor_specialty)
DELETE FROM milestone_templates
WHERE category_id IS NULL AND advisor_specialty IS NULL;
