
# Product Specification: Revised Price Offer (הגשת הצעה מעודכנת)

## 1. User Intent

**Primary Goal**: Enable a consultant to submit a new/revised price offer during an ongoing negotiation, after an initial proposal has already been submitted and a negotiation session is active.

**User Story**: 
> As a Consultant, after submitting my initial price offer and receiving a negotiation request from the Entrepreneur, I want to submit a revised price offer that addresses the Entrepreneur's requested changes, so that we can reach an agreement without starting a new proposal process.

---

## 2. Current System State Analysis

### Existing Flow (What Already Works)
The system already supports the "revised offer" concept through the negotiation response mechanism:

| Step | Action | Status |
|------|--------|--------|
| 1 | Consultant submits initial proposal | `status: submitted` |
| 2 | Entrepreneur initiates negotiation | `negotiation_sessions` created, proposal `status: negotiation_requested` |
| 3 | Consultant responds with counter-offer | `send-negotiation-response` edge function creates `proposal_versions` entry |
| 4 | Proposal status updated | `status: resubmitted` |

### Key Components Involved
- `NegotiationResponseView.tsx` - Consultant's view for responding to negotiation requests
- `send-negotiation-response/index.ts` - Edge function that creates new proposal version
- `submit_negotiation_response` - Database RPC that handles versioning
- `proposal_versions` table - Stores version history
- `NegotiationStepsTimeline.tsx` - Displays offer history (V1, V2, etc.)

---

## 3. Feature Name & Terminology

| Hebrew | English | Context |
|--------|---------|---------|
| הגשת הצעת מחיר מעודכנת | Submit Revised Price Offer | Primary action label |
| הצעה נגדית | Counter-Offer | Current terminology in code |
| הצעה V2 / V3 | Offer V2 / V3 | Version labels in timeline |
| עדכון הצעה | Update Offer | Alternative terminology |

**Recommendation**: Standardize on "הצעה מעודכנת" (Revised Offer) for user-facing UI, keeping "הצעה נגדית" (Counter-Offer) as a secondary/legal term.

---

## 4. Exact UI Action and Button Behavior

### 4.1 Entry Points for "Revised Price Offer"

**Location 1: Advisor Dashboard - Negotiations Tab**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 משא ומתן פעיל                                                │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🏗️ פרויקט: מבנה מרפאת אלופאתיה                               │ │
│ │ מחיר מקורי: ₪55,000 → מחיר יעד: ₪50,000 (-9%)              │ │
│ │                                                             │ │
│ │ [הגב לבקשה] ← Primary CTA (existing)                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Location 2: Negotiation Response Page (`/negotiation/:sessionId`)**
```
┌─────────────────────────────────────────────────────────────────┐
│ Tab: תגובה (Response)                                           │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ סיכום ההצעה שלך                                              │ │
│ │ ┌───────────┬───────────┬───────────┐                        │ │
│ │ │ מחיר מקורי│ יעד היזם  │ ההצעה שלך │                        │ │
│ │ │ ₪55,000  │ ₪50,000  │ ₪52,000  │                        │ │
│ │ └───────────┴───────────┴───────────┘                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ הודעה ליזם (אופציונלי)                                       │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ [Textarea: הוסף הערות או הסברים להצעה המעודכנת...]      │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [דחה בקשה]  [קבל מחיר יעד]  [🔵 הגש הצעת מחיר מעודכנת]         │
│                               ↑ PRIMARY CTA                     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Button Specifications

| Button | Current Label | Proposed Label | Variant | Icon |
|--------|---------------|----------------|---------|------|
| Submit Counter-Offer | שלח הצעה נגדית | הגש הצעת מחיר מעודכנת | Primary (blue) | Send |
| Accept Target Price | קבל מחיר יעד | אשר מחיר יעד | Outline (green) | Check |
| Decline Request | דחה בקשה | דחה בקשה | Destructive (red) | XCircle |

### 4.3 Button Click Behavior

**On Click "הגש הצעת מחיר מעודכנת":**

1. **Pre-flight Validation** (client-side):
   - Verify all mandatory items have prices ≥ 0
   - Verify milestone percentages sum to 100% (if applicable)
   - Verify `newTotal > 0` (prevent zero/negative offers)

2. **Confirmation Dialog** (new requirement):
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ אישור הגשת הצעה מעודכנת                                      │
│                                                                 │
│ אתה עומד להגיש הצעת מחיר מעודכנת:                               │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ מחיר מקורי: ₪55,000                                         │ │
│ │ מחיר חדש: ₪52,000                                           │ │
│ │ הפחתה: -5.5%                                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ⚠️ שים לב: זוהי הצעה מחייבת. לאחר ההגשה, היזם יקבל הודעה       │
│ וההצעה תהיה זמינה לאישור. לא ניתן לבטל הגשה.                    │
│                                                                 │
│                              [ביטול]  [🔵 אשר והגש הצעה]        │
└─────────────────────────────────────────────────────────────────┘
```

3. **On Confirm**:
   - Call `send-negotiation-response` edge function
   - Create new `proposal_versions` entry
   - Update `proposals.status` to `resubmitted`
   - Update `negotiation_sessions.status` to `responded`
   - Send email notification to Entrepreneur
   - Create in-app notification

4. **Success State**:
   - Toast: "ההצעה המעודכנת נשלחה בהצלחה"
   - Redirect to Advisor Dashboard
   - Timeline shows new "הצעה V2" entry

---

## 5. State Changes and Validation Rules

### 5.1 State Machine

```
┌──────────────────────────────────────────────────────────────────┐
│                     PROPOSAL STATUS FLOW                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [submitted] ────────────────────────────────────────────────►   │
│       │                                                          │
│       ▼                                                          │
│  [negotiation_requested] ◄──── Entrepreneur initiates            │
│       │                                                          │
│       ├──► [resubmitted] ◄──── Consultant submits revised offer  │
│       │         │                                                │
│       │         ├──► [accepted] ◄──── Entrepreneur approves      │
│       │         │                                                │
│       │         └──► [negotiation_requested] ◄── Another round   │
│       │                                                          │
│       └──► [cancelled] ◄──── Consultant declines negotiation     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Negotiation Session Status

| Status | Meaning | Consultant Can Respond? |
|--------|---------|------------------------|
| `open` | Session created, awaiting details | No |
| `awaiting_response` | Ready for consultant response | ✅ Yes |
| `responded` | Consultant submitted revised offer | No |
| `resolved` | Entrepreneur accepted/rejected | No |
| `cancelled` | Session cancelled | No |

### 5.3 Validation Rules

**Price Validation:**
```typescript
// Minimum: Must be greater than 0
if (newTotal <= 0) {
  throw new Error("סכום ההצעה חייב להיות גדול מאפס");
}

// Maximum: No upper limit, but warn if higher than original
if (newTotal > originalTotal) {
  showWarning("ההצעה החדשה גבוהה מההצעה המקורית - האם להמשיך?");
}

// Reasonable change: Warn if discount > 50%
const discountPercent = ((originalTotal - newTotal) / originalTotal) * 100;
if (discountPercent > 50) {
  showWarning("ההנחה המוצעת עולה על 50% - האם אתה בטוח?");
}
```

**Milestone Validation:**
```typescript
const totalPercentage = milestoneResponses.reduce(
  (sum, m) => sum + m.advisorResponsePercentage, 0
);
if (Math.abs(totalPercentage - 100) > 0.01) {
  throw new Error(`סה"כ אחוזי אבני דרך חייב להיות 100% (כרגע: ${totalPercentage}%)`);
}
```

**Rate Limiting:**
- Maximum 3 revised offers per proposal per hour
- Prevents spam/abuse

---

## 6. Constraints and Edge Cases

### 6.1 Permission Constraints

| Constraint | Rule |
|------------|------|
| User Role | Only `advisor` role can submit revised offers |
| Session Ownership | `consultant_advisor_id` must match current user's advisor ID |
| Session Status | Only `awaiting_response` sessions allow submission |
| Time Limit | Session must not be expired (if deadline exists) |

### 6.2 Edge Cases

| Edge Case | System Behavior |
|-----------|-----------------|
| **Simultaneous Edits** | Last write wins; optimistic locking via `updated_at` check |
| **Same Price Submitted** | Allow submission (counts as confirmation of original offer) |
| **Network Failure During Submit** | Show retry option; don't create duplicate versions |
| **Session Cancelled While Editing** | On submit, show error "בקשת המשא ומתן בוטלה" |
| **Browser Closed Mid-Edit** | No auto-save; user must resubmit |
| **Multiple Browser Tabs** | Warn on navigation; prevent duplicate submissions |
| **Zero Line Items** | Allow submission with total price only (non-itemized) |
| **Negative Discount (Price Increase)** | Allow with warning confirmation |

### 6.3 Maximum Revisions Constraint

**Business Rule**: No hard limit on number of revisions, but:
- Each revision is logged in `proposal_versions`
- Timeline displays all versions (V1, V2, V3...)
- Entrepreneur sees full negotiation history

---

## 7. Expected System Behavior After Submission

### 7.1 Database Updates

| Table | Field | Update |
|-------|-------|--------|
| `proposals` | `status` | `'resubmitted'` |
| `proposals` | `price` | New total price |
| `proposals` | `current_version` | Incremented |
| `proposals` | `fee_line_items` | Updated JSONB with new prices |
| `proposal_versions` | (new row) | Snapshot of revised offer |
| `negotiation_sessions` | `status` | `'responded'` |
| `negotiation_sessions` | `responded_at` | Current timestamp |
| `negotiation_sessions` | `consultant_response_message` | Message text |
| `activity_log` | (new row) | `action: 'negotiation_responded'` |

### 7.2 Notifications

**Email to Entrepreneur:**
```
Subject: הצעה מעודכנת התקבלה - {project_name}

שלום {entrepreneur_name},

היועץ {advisor_company} שלח הצעה מעודכנת לפרויקט {project_name}:

• מחיר קודם: ₪{previous_price}
• מחיר חדש: ₪{new_price}
• הפחתה: {reduction_percent}%

{consultant_message if provided}

[לצפייה בהצעה המעודכנת]
```

**In-App Notification:**
- Type: `negotiation_response`
- Priority: 2 (high)
- Target: `project.owner_id`

### 7.3 UI Updates

**Advisor Dashboard:**
- Negotiation card moves from "פעיל" to "הוגש"
- Status badge: "הצעה נשלחה ✓"

**Entrepreneur Project View:**
- Proposal card shows "🔄 הצעה מעודכנת" badge
- Timeline shows new "הצעה V{n}" entry
- "קבל הצעה" button remains active

**Negotiation Timeline:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📄 01/02/2026  הצעה מקורית         ₪55,000    [הוגשה] [צפה] │
│ 💬 03/02/2026  בקשה לשינויים                 [משא ומתן] [צפה]│
│ 🔄 05/02/2026  הצעה V2              ₪52,000    [הוגשה] [צפה] │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Audit Trail

| Field | Value |
|-------|-------|
| `actor_id` | Consultant's user ID |
| `actor_type` | `'advisor'` |
| `action` | `'negotiation_responded'` |
| `entity_type` | `'proposal'` |
| `entity_id` | Proposal UUID |
| `project_id` | Project UUID |
| `meta` | `{ session_id, new_version_id, new_version_number, new_price }` |

---

## 8. Implementation Files to Modify

### 8.1 UI Changes

| File | Change |
|------|--------|
| `src/components/negotiation/NegotiationResponseView.tsx` | Update CTA label to "הגש הצעת מחיר מעודכנת", add confirmation dialog |
| `src/pages/AdvisorDashboard.tsx` | Update status display for responded negotiations |
| `src/components/NegotiationStepsTimeline.tsx` | Ensure V2+ labels are clear |

### 8.2 Logic Changes

| File | Change |
|------|--------|
| `src/hooks/useNegotiation.ts` | Add rate limiting check before submission |
| `supabase/functions/send-negotiation-response/index.ts` | Already handles versioning correctly |

### 8.3 Microcopy Updates

| Location | Current | Updated |
|----------|---------|---------|
| Submit Button | שלח הצעה נגדית | הגש הצעת מחיר מעודכנת |
| Confirmation Title | (none) | אישור הגשת הצעה מעודכנת |
| Success Toast | (generic) | ההצעה המעודכנת נשלחה בהצלחה |
| Tab Label | תגובה | הגש הצעה מעודכנת |

---

## 9. Summary

The "Revised Price Offer" feature is **already implemented** in the current codebase through the `NegotiationResponseView` component and `send-negotiation-response` edge function. The recommended changes are:

1. **Rename CTA** from "שלח הצעה נגדית" to "הגש הצעת מחיר מעודכנת"
2. **Add Confirmation Dialog** with price summary and binding warning
3. **Improve Microcopy** for clarity and legal compliance
4. **Add Rate Limiting** to prevent abuse
5. **Standardize Terminology** across all UI components

The versioning, email notifications, and audit logging are already fully functional.
