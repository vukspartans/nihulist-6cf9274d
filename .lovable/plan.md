
# UX Pattern Design: Required Acknowledgment with Validation

## 1. Overview

This is a **required acknowledgment pattern** where users must explicitly confirm understanding before proceeding with a critical action. The implementation will be based on the existing `ToSAcceptanceModal` structure but with enhanced validation messaging and accessibility features.

## 2. User Intent & Context

**Primary Goal**: Ensure users understand and acknowledge critical system requirements before proceeding, creating an auditable record of their explicit consent.

**Use Cases**:
- Terms of Service acceptance (already implemented in `ToSAcceptanceModal.tsx`)
- Critical action confirmations (e.g., submitting binding proposals)
- Operational requirements (e.g., understanding payment terms)
- Risk acknowledgments (e.g., accepting binding negotiation offers)

## 3. Final UX Behavior

### Visual Hierarchy & Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ INFORMATION SECTION (Background: light blue/primary/10)         │
│ ├─ Icon: AlertCircle or equivalent                             │
│ ├─ Title: "שים לב / Critical Notice"                           │
│ └─ Description: Clear, human-readable explanation              │
├─────────────────────────────────────────────────────────────────┤
│ SCROLLABLE CONTENT (if applicable)                              │
│ ├─ Detailed terms, conditions, or requirements                 │
│ └─ Maximum height: 300-400px with internal scroll             │
├─────────────────────────────────────────────────────────────────┤
│ ACKNOWLEDGMENT SECTION (Background: subtle, rounded)            │
│ ├─ Checkbox + Label (flex row-reverse for RTL)                │
│ ├─ Inline Error (if validation fails)                          │
│ └─ Color: Accessible neutral/slate for unchecked state        │
├─────────────────────────────────────────────────────────────────┤
│ ACTION BUTTONS SECTION (sticky footer)                         │
│ ├─ Primary CTA: Disabled until checkbox checked               │
│ ├─ Secondary: Cancel/Go Back                                   │
│ └─ Footer text: Consequences of action (e.g., VAT disclaimer) │
└─────────────────────────────────────────────────────────────────┘
```

### State Transitions

**Initial State** (Page Load):
- Checkbox: Unchecked
- Primary CTA: Disabled (greyed out, not clickable)
- Validation Message: Hidden
- Content: Visible, scrollable

**User Checks Checkbox**:
- Checkbox: Checked (filled with blue)
- Primary CTA: Enabled (clickable)
- Validation Message: Hidden
- Visual Feedback: Subtle green highlight on checkbox container (optional)

**User Unchecks Checkbox** (if previously checked):
- Checkbox: Unchecked
- Primary CTA: Disabled (reverts)
- Validation Message: Hidden

**User Attempts Click Without Checking** (required):
- Validation Error: Appears inline below checkbox
- Focus: Moves to checkbox (screen readers announce)
- Message: "יש לאשר את האמור לעיל כדי להמשיך" (You must confirm the above to proceed)
- Visual: Red/destructive border or background tint on checkbox container

**User Clicks Primary CTA While Checked**:
- CTA: Shows loading state (spinner)
- Checkbox: Disabled during submission
- Error Message: Cleared
- On Success: Modal closes, record audited in database

## 4. Validation Logic

### Client-Side Validation

```typescript
// State
const [isChecked, setIsChecked] = useState(false);
const [showError, setShowError] = useState(false);
const [loading, setLoading] = useState(false);

// Checkbox Handler
const handleCheckChange = (checked: boolean) => {
  setIsChecked(checked);
  // Clear error when user checks box
  if (checked && showError) {
    setShowError(false);
  }
};

// Primary CTA Handler
const handleProceed = async (e: React.MouseEvent) => {
  e.preventDefault();
  
  // Validation Check
  if (!isChecked) {
    setShowError(true);
    // Announce error to screen readers
    const errorElement = document.getElementById('acknowledgment-error');
    if (errorElement) {
      errorElement.focus();
      errorElement.setAttribute('role', 'alert');
    }
    return;
  }
  
  setLoading(true);
  try {
    // Call API to record acknowledgment + proceed with action
    await submitAcknowledgment();
  } finally {
    setLoading(false);
  }
};

// Disabled State Logic
const isCTADisabled = !isChecked || loading;
```

### Server-Side Validation (Audit Trail)

```typescript
// Record in database
const recordAcknowledgment = async (
  userId: string,
  acknowledgmentType: string,
  version: string,
  ipAddress?: string,
  userAgent?: string
) => {
  const { error } = await supabase.from('user_acknowledgments').insert({
    user_id: userId,
    acknowledgment_type: acknowledgmentType,
    version: version,
    acknowledged_at: new Date().toISOString(),
    ip_address: ipAddress,
    user_agent: userAgent,
  });
  
  if (error) throw error;
};
```

## 5. Edge Cases & Handling

| Edge Case | Behavior |
|-----------|----------|
| **User closes dialog without confirming** | Modal remains open (non-dismissible by default) |
| **Form submission fails** | Show error toast, checkbox remains checked, allow retry |
| **User navigates away mid-submission** | Show unsaved changes warning (if applicable) |
| **Browser back button** | Modal persists (non-closeable until confirmed) |
| **Keyboard only navigation** | Tab → Checkbox → Error message → CTA buttons; Enter to toggle/submit |
| **Screen reader access** | Checkbox role, error messages have role="alert", labels linked via htmlFor |
| **Mobile viewport** | Checkbox label wraps, modal scrolls internally, CTA sticky |
| **Same acknowledgment re-triggered** | Skip modal if `tos_accepted_at` already exists in database |
| **User submits same acknowledgment twice** | Prevent duplicate records via unique constraint or check |

## 6. Accessibility Requirements

### ARIA & Semantic HTML
- **Checkbox**: `<input type="checkbox" id="ack" />`
- **Label**: `<label htmlFor="ack">` (properly linked)
- **Error Container**: `id="acknowledgment-error" role="alert" aria-live="polite"`
- **Dialog**: `role="alertdialog"` if dismissal is prevented

### Keyboard Navigation
- **Tab order**: Scrollable content (if focusable) → Checkbox → Error message → Primary CTA → Secondary CTA
- **Escape Key**: Disabled (prevents accidental dismissal)
- **Enter Key**: Submits form from any field

### Color & Contrast
- **Error text**: WCAG AA compliant contrast ratio
- **Disabled CTA**: Meets minimum contrast; not grey-on-grey
- **Checkbox border**: Visible focus ring (minimum 2px solid, high contrast color)

### Screen Reader Announcements
- **Initial**: "Dialog: [Title]. [Description]. To proceed, you must check the acknowledgment checkbox."
- **On Error**: "Error: [Message]. Focus moved to acknowledgment checkbox. Please check the box to continue."
- **On Success**: "Acknowledgment recorded. Closing dialog."

## 7. Proposed Microcopy

### Checkbox Label (Standard Pattern)

**Hebrew (RTL)**:
- "אני מאשר/ת את תנאי השימוש של פלטפורמת בילדינג ומתחייב/ת לפעול על פיהם"
- *Short & formal, using "מאשר/ת" (confirm) and "מתחייב/ת" (commit)*

**Alternative (More Explicit)**:
- "אני מבין/ה וקורא/ת את תנאי השימוש ומסכים/ה ללחיצה על הכפתור"
- *Emphasizes understanding + reading before agreement*

### Inline Error Message (When Unchecked & CTA Clicked)

**Hebrew**:
- "יש לאשר את האמור לעיל כדי להמשיך" (You must confirm the above to proceed)
- *Clear, direct, not punitive*

**Alternative**:
- "אנא סמן את תיבת האישור כדי להמשיך" (Please check the confirmation box to proceed)
- *More conversational, "please" format*

### Header / Dialog Title

**Hebrew**:
- "אישור תנאי השימוש" (Confirm Terms of Use)
- or "שים לב: נדרש אישור" (Notice: Confirmation Required)

### Primary CTA Microcopy

**Hebrew**:
- "אשר והמשך" (Confirm and Continue)
- or "אשר ותגש" (Confirm and Submit)

**When Disabled**:
- Keep same label, show visual disabled state (greyed out)
- Tooltip (optional): "יש לאשר את תיבת האישור לפני ההמשך"

### Helper Text (Below CTA)

**Hebrew**:
- "* לא ניתן להמשיך להשתמש במערכת ללא אישור תנאי השימוש"
- *Reinforces non-optional nature*

## 8. Implementation Files & Changes

### New Component (Optional)
Create a reusable `<RequiredAcknowledgmentPattern />` component with:
- Props: `title`, `description`, `content`, `checkboxLabel`, `onConfirm`, `isLoading`
- Internal state: `isChecked`, `showError`
- Built-in validation and error messaging

### Modify Existing Components

**`src/components/ToSAcceptanceModal.tsx`**:
- Add inline error state & message
- Add error announcement logic (role="alert")
- Add disabled state styling on CTA
- Import `AlertCircle` icon for visual emphasis

**`src/pages/Auth.tsx` (signup step 3)**:
- Validate `tosAccepted` before form submission
- Show error toast if not checked (already done, but enhance messaging)

**`src/lib/auditLog.ts`** (or new audit utility):
- Record acknowledgment timestamp + version + IP (for compliance)
- Called on successful confirmation

## 9. Visual Design Details

### Color & Styling

**Warning/Notice Section**:
```
Background: bg-blue-50/50 dark:bg-blue-950/20
Border: border-blue-200 dark:border-blue-800
Icon: text-blue-600
Text: text-blue-700 dark:text-blue-300
```

**Acknowledgment Checkbox Section**:
```
Normal State:
  Background: transparent or muted/20
  Border: border-input (subtle)
  
Checked State:
  Background: subtle highlight (blue/5)
  Checkbox: filled with primary color

Error State:
  Background: red-50/30
  Border: border-red-300 dark:border-red-700
  Error Text: text-red-600 dark:text-red-400
```

**Primary CTA**:
```
Enabled: bg-primary, hover:bg-primary/90, cursor-pointer
Disabled: bg-muted, text-muted-foreground, cursor-not-allowed, opacity-50
Loading: show spinner icon, disabled
```

### Typography & Spacing

- **Checkbox Label**: `text-sm font-medium leading-relaxed`
- **Error Message**: `text-sm text-red-600 mt-2`
- **Helper Text**: `text-xs text-muted-foreground`
- **Overall Layout**: `space-y-4` between major sections

## 10. Summary of Key Decisions

1. **Non-Dismissible Modal**: Prevents accidental skipping; uses `onPointerDownOutside` + `onEscapeKeyDown` preventDefault
2. **Inline Error Over Toast**: Error appears adjacent to checkbox for immediate context
3. **Disabled CTA vs Hidden CTA**: Disabled is clearer UX; shows requirement visually
4. **Checkbox as Primary UX**: More explicit than accepting by clicking CTA; auditable action
5. **Clear Microcopy**: Avoids legal jargon; uses simple Hebrew with gender-inclusive forms (מ/ת endings)
6. **Audit Trail**: Timestamps + versions recorded in database for compliance & legal proof
7. **Accessibility First**: Full keyboard navigation, screen reader support, WCAG AA contrast ratios

## 11. Expected Outcomes

- **User Experience**: Clear, unambiguous requirement; feels fair, not aggressive
- **Compliance**: Explicit acknowledgment recorded + timestamped in audit log
- **Accessibility**: Keyboard + screen reader friendly; error states announced
- **Reusability**: Pattern can be applied to other critical acknowledgments (payment terms, binding offers, etc.)

