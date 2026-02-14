

# Seed Test Data for Full Payment Lifecycle Testing

## What We Have

Both test users already exist in the database:

| User | Email | User ID | Role |
|------|-------|---------|------|
| Entrepreneur | entrepreneur.test+billding@example.com | `aaaa...0001` | entrepreneur |
| Vendor/Consultant | vendor.test+billding@example.com | `aaaa...0002` | advisor |

A sandbox project ("TEST_ONLY__Sandbox Project 001") exists, owned by the entrepreneur. The vendor has an advisor record. However, the project is missing:

1. A `project_advisors` link (vendor not assigned to project)
2. Payment milestones
3. Payment-critical tasks linked to milestones

## What We Will Seed

We will create a migration that inserts the minimal data needed to test the full Golden Path:

### Data to Insert

1. **`project_advisors`** -- Link the vendor consultant to the sandbox project with a fee of 50,000 ILS.

2. **`payment_milestones`** (2 milestones) -- 
   - "Milestone A: Plan Submission" -- 25,000 ILS, status `pending`
   - "Milestone B: Committee Approval" -- 25,000 ILS, status `pending`

3. **Update 2 existing `project_tasks`** -- Mark them as `is_payment_critical = true` and link them to the milestones:
   - Task "בדיקת היתכנות תכנונית" (Feasibility Study) linked to Milestone A
   - Task "הגשת תוכניות למכון בקרה" (Plan Submission) linked to Milestone B

### Test Flow After Seeding

Once the data is seeded, you can test the full lifecycle:

1. **Log in as Entrepreneur** -- Go to Task Board, mark "בדיקת היתכנות תכנונית" as Done. The trigger should auto-unlock Milestone A to `due`.

2. **Log in as Vendor** -- Go to Payments tab. The "New Payment Request" button should now be enabled. Create a request for Milestone A (25,000 ILS). Then click the new "Submit" button to move it from `prepared` to `submitted`.

3. **Log back in as Entrepreneur** -- Go to Payment Dashboard. The submitted request should appear. Click "Approve" to advance it through the chain.

4. **Go to /accountant** -- The approved request appears in the Liabilities tab. Set a payment date and click "Mark as Paid".

5. **Log back in as Vendor** -- The request should show as `paid` with a "Tax Invoice Required" alert.

## Technical Details

A single Supabase migration file will be created with:

```text
-- 1. Insert project_advisors record
INSERT INTO project_advisors (project_id, advisor_id, fee_amount, fee_currency, status, advisor_type)
VALUES ('sandbox-project-id', 'vendor-advisor-id', 50000, 'ILS', 'active', 'יועץ בדיקות (TEST)');

-- 2. Insert 2 payment milestones linked to that project_advisor
INSERT INTO payment_milestones (project_id, project_advisor_id, name, amount, status, percentage_of_total, display_order)
VALUES 
  (..., 'Milestone A: Plan Submission', 25000, 'pending', 50, 1),
  (..., 'Milestone B: Committee Approval', 25000, 'pending', 50, 2);

-- 3. Update 2 existing tasks to be payment-critical and link to milestones
UPDATE project_tasks SET is_payment_critical = true, payment_milestone_id = <milestone_a_id>
WHERE id = 'task-feasibility-id';

UPDATE project_tasks SET is_payment_critical = true, payment_milestone_id = <milestone_b_id>
WHERE id = 'task-plan-submission-id';
```

All IDs will use deterministic UUIDs for easy reference and cleanup.

