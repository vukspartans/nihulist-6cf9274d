

# Refined UX Specification: Milestone Change Window

## Executive Summary

This specification defines the exact copy and behavior for communicating milestone editability rules to **consultants** (יועץ) on the proposal submission and negotiation response screens. All terminology has been aligned with actual system actions.

---

## 1. Terminology Alignment Matrix

| Concept | CORRECT Term (Hebrew) | CORRECT Term (English) | INCORRECT Terms to Avoid |
|---------|----------------------|------------------------|--------------------------|
| Stop milestone edits | נעולים / נעול | Locked | "Frozen", "Disabled" |
| Consultant withdraws their proposal | ביטול ההצעה / ביטול | Cancel (proposal) | "Decline", "Reject", "Withdraw" |
| Entrepreneur declines proposal | דחייה | Reject | Do not use from consultant perspective |
| Create new proposal | הגש הצעה חדשה | Submit new proposal | "Restart", "Redo" |
| Send proposal | הגשה | Submit | "Send", "Deliver" |
| Proposal awaiting response | בהמתנה לאישור | Awaiting approval | Avoid "pending" |

---

## 2. User Perspective: Consultant (יועץ)

All copy on proposal submission and negotiation screens is written from the **consultant's perspective**. The consultant:
- Submits their proposal
- Can edit milestones **until** they submit
- Cannot edit milestones **after** submission
- Must cancel their own proposal to make structural changes

---

## 3. Refined Copy by Location

### 3.1 Primary Explanation (Pre-Submission)

**Location**: `ConsultantPaymentTerms.tsx` — shown above milestone table

**Hebrew (RTL)**:
```
כותרת: חלון שינויים
גוף: ניתן לערוך אבני דרך עד להגשת ההצעה.
      לאחר ההגשה, אבני הדרך נעולות.
      לשינוי אבני דרך לאחר ההגשה, יש לבטל את ההצעה ולהגיש הצעה חדשה.
```

**English (for reference)**:
```
Title: Change Window
Body: Milestones can be edited until the proposal is submitted.
      After submission, milestones are locked.
      To change milestones after submission, the proposal must be canceled and a new proposal submitted.
```

**Design Specifications**:
- Container: `Alert` with `border-amber-200 bg-amber-50/50`
- Icon: `AlertCircle` (no emoji)
- Typography: Title as `font-medium`, body as `text-sm`
- No decorative symbols or emojis

---

### 3.2 Helper Text (Optional Tip)

**Location**: Below milestone table, before submit button

**Hebrew**:
```
ודא שאחוזי התשלום נכונים לפני ההגשה.
```

**English**:
```
Verify payment percentages before submission.
```

**Design**: `text-xs text-muted-foreground`, no icon

---

### 3.3 Tooltip (On Milestone Section Header)

**Location**: Info icon next to "אבני דרך ותנאי תשלום" heading

**Hebrew**:
```
אבני דרך ניתנות לעריכה עד להגשת ההצעה.
```

**English**:
```
Milestones are editable until the proposal is submitted.
```

**Constraint**: Single sentence only; do not repeat full explanation

---

### 3.4 Read-Only State Label (Post-Submission)

**Location**: Inline badge or text when milestone inputs are disabled

**Hebrew**:
```
נעול לאחר הגשה
```

**English**:
```
Locked after submission
```

**Design**: 
- Badge: `bg-muted text-muted-foreground border`
- Icon: `Lock` (h-3 w-3)
- Displayed inline next to disabled inputs OR as a banner above table

---

### 3.5 Negotiation State Clarification

**Location**: `NegotiationResponseView.tsx` — Milestones tab

**Hebrew**:
```
כותרת: שינויים באבני דרך
גוף: במסגרת המשא ומתן ניתן לעדכן מחירים ואחוזי אבני דרך.
      שינוי מבני (הוספה או הסרה של אבני דרך) מחייב ביטול ההצעה והגשת הצעה חדשה.
```

**English**:
```
Title: Milestone Changes
Body: During negotiation, prices and milestone percentages can be updated.
      Structural changes (adding or removing milestones) require canceling the proposal and submitting a new one.
```

**Design**: `Alert` with `border-blue-200 bg-blue-50/50`

---

## 4. State-Based Display Logic

| Proposal Status | Milestones Editable? | Display |
|-----------------|---------------------|---------|
| `draft` | Yes | Primary explanation (change window) |
| `submitted` | No | Locked label + disabled inputs |
| `negotiation_requested` | Percentages only | Negotiation clarification alert |
| `resubmitted` | No | Locked label |
| `accepted` | No | Locked label |
| `canceled` | N/A | Proposal no longer visible |

---

## 5. Validation & Error States

### 5.1 Milestone Total Validation

**Error (when sum ≠ 100%)**:
```
Hebrew: סה"כ אחוזי אבני דרך חייב להיות 100%. כרגע: {total}%.
English: Total milestone percentages must equal 100%. Current: {total}%.
```

### 5.2 Attempt to Edit Locked Milestones

If a user somehow triggers an edit action on a locked field (edge case):
```
Hebrew: לא ניתן לערוך אבני דרך לאחר הגשת ההצעה.
English: Milestones cannot be edited after proposal submission.
```

---

## 6. Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| RTL Support | `dir="rtl"` on container, `text-right` alignment |
| Keyboard Navigation | Tooltip accessible via Tab, Enter to activate |
| Screen Readers | Alert has `role="status"`, disabled fields have `aria-disabled="true"` |
| Color Independence | Lock icon + text label, not just color change |

---

## 7. Files to Modify

| File | Changes |
|------|---------|
| `src/components/proposal/ConsultantPaymentTerms.tsx` | Add primary explanation Alert, add helper text, add read-only badge |
| `src/pages/SubmitProposal.tsx` | Add tooltip to milestone section header |
| `src/components/negotiation/NegotiationResponseView.tsx` | Add negotiation state clarification alert in Milestones tab |

---

## 8. Final Copy Summary

### Proposal Submission Screen (Editable State)

**Alert Box:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠ חלון שינויים                                                  │
│                                                                 │
│ ניתן לערוך אבני דרך עד להגשת ההצעה.                             │
│ לאחר ההגשה, אבני הדרך נעולות.                                   │
│ לשינוי אבני דרך לאחר ההגשה, יש לבטל את ההצעה ולהגיש הצעה חדשה.    │
└─────────────────────────────────────────────────────────────────┘
```

### Proposal Submission Screen (Locked State)

**Inline Badge:**
```
┌───────────────────────┐
│ 🔒 נעול לאחר הגשה      │
└───────────────────────┘
```

### Negotiation Response Screen (Milestones Tab)

**Alert Box:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ℹ שינויים באבני דרך                                              │
│                                                                 │
│ במסגרת המשא ומתן ניתן לעדכן מחירים ואחוזי אבני דרך.              │
│ שינוי מבני (הוספה או הסרה של אבני דרך) מחייב ביטול ההצעה         │
│ והגשת הצעה חדשה.                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tooltip

```
אבני דרך ניתנות לעריכה עד להגשת ההצעה.
```

---

## 9. Implementation Code Snippets

### Primary Alert (ConsultantPaymentTerms.tsx)

```tsx
<Alert className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
  <AlertCircle className="h-4 w-4 text-amber-600" />
  <AlertDescription className="text-amber-800 dark:text-amber-200">
    <p className="font-medium mb-1">חלון שינויים</p>
    <p className="text-sm">
      ניתן לערוך אבני דרך עד להגשת ההצעה.
    </p>
    <p className="text-sm mt-1">
      לאחר ההגשה, אבני הדרך נעולות.
      לשינוי אבני דרך לאחר ההגשה, יש לבטל את ההצעה ולהגיש הצעה חדשה.
    </p>
  </AlertDescription>
</Alert>
```

### Locked State Badge

```tsx
<Badge variant="secondary" className="gap-1 text-muted-foreground">
  <Lock className="h-3 w-3" />
  נעול לאחר הגשה
</Badge>
```

### Negotiation Clarification Alert

```tsx
<Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
  <Info className="h-4 w-4 text-blue-600" />
  <AlertDescription className="text-blue-800 dark:text-blue-200">
    <p className="font-medium mb-1">שינויים באבני דרך</p>
    <p className="text-sm">
      במסגרת המשא ומתן ניתן לעדכן מחירים ואחוזי אבני דרך.
    </p>
    <p className="text-sm mt-1">
      שינוי מבני (הוספה או הסרה של אבני דרך) מחייב ביטול ההצעה והגשת הצעה חדשה.
    </p>
  </AlertDescription>
</Alert>
```

---

## 10. Review Checklist

| Criterion | Status |
|-----------|--------|
| User perspective consistency (consultant) | ✓ |
| Terminology alignment (cancel vs reject) | ✓ |
| No emojis in legal explanations | ✓ |
| RTL support | ✓ |
| Accessibility (keyboard, screen reader) | ✓ |
| Single-sentence tooltips | ✓ |
| Disabled state explanation | ✓ |
| Negotiation does not contradict lock rule | ✓ |

