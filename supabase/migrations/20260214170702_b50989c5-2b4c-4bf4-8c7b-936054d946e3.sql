
-- ============================================================
-- SEED: Test data for full payment lifecycle (Golden Path)
-- ============================================================

-- 1. Link vendor advisor to the sandbox project
INSERT INTO project_advisors (id, project_id, advisor_id, fee_amount, fee_currency, fee_type, status, advisor_type)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004',
  'c7b93dfd-58f6-43d8-aabf-5cce18f3119d',
  50000, 'ILS', 'fixed', 'active', 'יועץ בדיקות (TEST)'
)
ON CONFLICT DO NOTHING;

-- 2. Insert 2 payment milestones
INSERT INTO payment_milestones (id, project_id, project_advisor_id, name, amount, currency, status, percentage_of_total, display_order, trigger_type)
VALUES
  ('aaaaaaaa-1111-2222-3333-444444444401', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004', 'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff',
   'Milestone A: Plan Submission', 25000, 'ILS', 'pending', 50, 1, 'task_completion'),
  ('aaaaaaaa-1111-2222-3333-444444444402', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0004', 'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff',
   'Milestone B: Committee Approval', 25000, 'ILS', 'pending', 50, 2, 'task_completion')
ON CONFLICT DO NOTHING;

-- 3. Link existing tasks to milestones as payment-critical
UPDATE project_tasks
SET is_payment_critical = true,
    payment_milestone_id = 'aaaaaaaa-1111-2222-3333-444444444401'
WHERE id = 'e1dd6c5a-b05b-48fe-b9e3-8680f973b540';

UPDATE project_tasks
SET is_payment_critical = true,
    payment_milestone_id = 'aaaaaaaa-1111-2222-3333-444444444402'
WHERE id = 'd63cbc99-7f84-4477-9716-3f4e4867a0e1';
