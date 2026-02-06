
## Test Fee Items Addition Plan

### Current State
The test RFP (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001`) was created with two RFP invites but **no fee items** in the `rfp_request_fee_items` table. This means:
- Pre-submission invite (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002`): Opened, no proposal yet
- Submitted invite (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003`): Submitted, has a locked proposal

### What Needs to Be Added

#### 1. **Mandatory (חובה) Fee Items for Pre-Submission Invite**
These will be associated with invite `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002` and appear in the RFP wizard's Fees tab.

| Item # | Description | Unit | Qty | Charge Type | is_optional |
|--------|---|---|---|---|---|
| 1 | שירותי ייעוץ בשלב התכנון הראשוני | lump_sum | 1 | one_time | false |
| 2 | הכנת מסמכים והתוכנית הטכנית | hourly | 40 | hourly_rate | false |
| 3 | ליווי וייצוג מול הרשויות | per_consultant | 2 | hourly_rate | false |
| 4 | פיקוח עליון על הביצוע | per_floor | 5 | one_time | false |

#### 2. **Optional (אופציונלי) Fee Items for Pre-Submission Invite**
These represent add-on services the consultant can choose from.

| Item # | Description | Unit | Qty | Charge Type | is_optional |
|--------|---|---|---|---|---|
| 1 | הכנת תוכנית עסקית מפורטת | lump_sum | 1 | one_time | true |
| 2 | ייעוץ בנושא התקנות תשנ"ד (נגישות) | hourly | 8 | hourly_rate | true |

#### 3. **Fee Items for Submitted Proposal**
The proposal (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004`) needs `fee_line_items` in its JSONB column to display with visual styling. This allows testing the UI for:
- Visual differentiation (amber background, Shield icon for mandatory; neutral background, Info icon for optional)
- Badge styling (חובה vs אופציונלי)
- Total calculations (סה"כ פריטי חובה + סה"כ פריטים אופציונליים)

### Implementation Approach

**Create a new migration file**: `supabase/migrations/[timestamp]_add_fee_items_to_test_rfp.sql`

This migration will:

1. **Insert fee items for pre-submission invite** (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002`)
   - 4 mandatory items with display_order 0-3
   - 2 optional items with display_order 0-1
   - All with `is_optional = false/true` and proper charge_type

2. **Update the proposal** (`aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004`) with fee_line_items JSONB
   - Populate `fee_line_items` column with structured data
   - Include unit_price for each item to enable calculation demo
   - Mix mandatory and optional items with prices to show totaling
   - Expected format:
   ```json
   [
     {
       "id": "fee-1",
       "item_number": 1,
       "description": "שירותי ייעוץ בשלה התכנון",
       "unit": "lump_sum",
       "quantity": 1,
       "unit_price": 8000,
       "is_optional": false,
       "charge_type": "one_time"
     },
     // ... more items
   ]
   ```

3. **Validation & Constraints**
   - All UUIDs follow existing pattern (aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001)
   - `rfp_invite_id` references existing invites
   - `item_number` increments properly per is_optional group
   - `display_order` increments 0, 1, 2, etc. per group

### Testing Scenarios

After running the migration, the following test flows will be enabled:

1. **Vendor 1 (Pre-submission)**
   - Login: `vendor.test+billding@example.com` / `Billding2026!`
   - Navigate to RFP invite
   - View Fees tab → See 4 mandatory items + 2 optional items separated
   - Verify visual styling is NOT yet applied (pre-submission uses plain table)

2. **Vendor 2 (Submitted/Negotiation)**
   - Login: `vendor.test1+billding@example.com` / `TestPassword123!`
   - View submitted proposal
   - See proposal with fee_line_items rendered
   - Verify visual differentiation:
     - Mandatory items: Amber background, 4px amber right border, Shield icon, "חובה" badge
     - Optional items: Slate background, 2px slate right border, Info icon, "אופציונלי" badge
   - Verify footer totals: סה"כ פריטי חובה | סה"כ פריטים אופציונליים | סה"כ

3. **Entrepreneur (Project Owner)**
   - Can view proposals and see the fee differentiation
   - Can initiate negotiation and request price adjustments

### Files Modified
- **Create**: `supabase/migrations/[timestamp]_add_fee_items_to_test_rfp.sql` (new migration with INSERT statements)

### Notes
- The migration uses `ON CONFLICT (id) DO NOTHING` to be idempotent
- Uses actual UUIDs that follow the test pattern for consistency
- Provides realistic Hebrew descriptions for construction/consulting domain
- Includes realistic unit prices for negotiation testing (8000-15000 range)
