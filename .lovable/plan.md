

# Seed Default Task Templates for Common Project Types

## Problem
The "Load from Templates" button exists and works, but the `task_templates` table is completely empty (0 rows). Without templates, there is nothing to load.

## Solution

Create a database migration that seeds a starter set of task templates for common project types, grouped by licensing phases. This gives immediate value when clicking "Load from Templates".

### Templates to Seed

We will seed templates for the most common project type visible in the system ("מגורים" / Residential), organized by licensing phase. Each template includes name, default duration, advisor specialty, and display order.

**Phase: בדיקה ראשונית (Initial Review)**
- בדיקת היתכנות תכנונית (14 days, architect)
- בדיקת זכויות בנייה (7 days, architect)
- סקר סביבתי ראשוני (10 days, environmental consultant)

**Phase: תכנון ראשוני (Initial Planning)**
- הכנת תוכנית אדריכלית ראשונית (21 days, architect)
- חישובי שטחים ראשוניים (7 days, architect)
- תיאום יועצים ראשוני (5 days, project manager)

**Phase: הגשת בקשה להיתר (Permit Application)**
- הכנת תיק בקשה להיתר (14 days, architect)
- הגשת מסמכים לוועדה (3 days, architect)
- תשלום אגרות (2 days, entrepreneur)

**Phase: ביצוע (Execution)**
- פיקוח עליון (ongoing, architect) -- milestone
- בדיקות בטון (as needed, engineer) -- payment critical

### Technical Approach

1. **Migration file**: A single SQL migration that inserts rows into `task_templates`, referencing existing `licensing_phases` by name lookup.
2. **Fallback**: If licensing phases don't exist yet, templates are inserted with `licensing_phase_id = NULL` (grouped under "General Tasks").
3. **Project type matching**: Templates use `project_type = 'מגורים'` and `municipality_id = NULL` (general/all municipalities).

### What Changes

| Item | Action |
|---|---|
| `supabase/migrations/seed_task_templates.sql` | NEW -- inserts ~10-12 starter templates |

### After This

- Opening a "מגורים" project and clicking "טען מתבניות" will show templates grouped by phase
- Users can select which ones to load
- The `AutoTaskSuggestionBanner` will also start working for new empty projects
- Additional project types and municipality-specific templates can be added later via the Admin panel
