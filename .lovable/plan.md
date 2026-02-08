
# Validation Report: Consultant Proposal Submission Features

## Summary
I've validated both items. Here are the findings:

---

## 1. **שינוי יועץ - הגשת הצעה - חתימה: Declaration Checkbox Emphasis**

### ⚠️ Status: PARTIALLY IMPLEMENTED

**Current Implementation (SubmitProposal.tsx lines 1340-1350):**
```typescript
<div className="flex items-start gap-3">
  <Checkbox 
    id="declaration" 
    checked={declarationAccepted} 
    onCheckedChange={(checked) => setDeclarationAccepted(checked as boolean)} 
  />
  <Label htmlFor="declaration" className="text-sm cursor-pointer">
    אני מצהיר/ה...
  </Label>
</div>
```

**Finding:**
- The checkbox exists but has **NO blinking/emphasis animation**
- The blink animation (`animate-checkbox-blink`) exists in `tailwind.config.ts` and is used in `ProposalApprovalDialog.tsx` - but **NOT in SubmitProposal.tsx**

**Compare to ProposalApprovalDialog.tsx (lines 83-102, 454-457):**
```typescript
// Has blink animation state:
const [showBlinkAnimation, setShowBlinkAnimation] = useState(false);

// Blink animation for authorization checkbox
useEffect(() => {
  if (step === 'signature' && !authorizationAccepted) {
    const startTimer = setTimeout(() => setShowBlinkAnimation(true), 2000);
    const stopTimer = setTimeout(() => setShowBlinkAnimation(false), 5000);
    return () => { clearTimeout(startTimer); clearTimeout(stopTimer); };
  } else {
    setShowBlinkAnimation(false);
  }
}, [step, authorizationAccepted]);

// Checkbox with animation class:
<Checkbox
  className={cn(
    "mt-0.5 shrink-0",
    showBlinkAnimation && "animate-checkbox-blink"
  )}
/>
```

### Required Fix:
Add the same blink animation logic to `SubmitProposal.tsx` for the declaration checkbox on the signature tab.

---

## 2. **שינוי יועץ - הגשת הצעה: Default Payment Terms from Entrepreneur**

### ⚠️ Status: PARTIALLY IMPLEMENTED

**Current Implementation (SubmitProposal.tsx line 121):**
```typescript
const [paymentTermType, setPaymentTermType] = useState<...>('current');
```

**Finding:**
- Default is hardcoded to `'current'` (שוטף)
- **There is NO useEffect to initialize payment term type from entrepreneur's data**

**Compare to milestone initialization (lines 224-237):**
- Milestones ARE properly initialized from `entrepreneurData?.payment_terms?.milestone_payments`
- But **payment_term_type is NOT initialized** from `entrepreneurData?.payment_terms?.payment_term_type`

**ConsultantPaymentTerms.tsx (line 322) partially handles this:**
```typescript
<Select
  value={paymentTermType || entrepreneurPaymentType || 'current'}
  ...
```

This means:
- If `paymentTermType` is undefined, it shows entrepreneur's value
- But the initial state is `'current'`, not `undefined`, so it shows `'current'` instead of entrepreneur's preference

### Required Fix:
Add a useEffect to initialize `paymentTermType` from `entrepreneurData?.payment_terms?.payment_term_type` when entrepreneur data loads:

```typescript
// Initialize payment term type from entrepreneur data
useEffect(() => {
  if (entrepreneurData?.payment_terms?.payment_term_type && !paymentTermType) {
    setPaymentTermType(entrepreneurData.payment_terms.payment_term_type);
  }
}, [entrepreneurData]);
```

Or alternatively, change initial state to `undefined` and let the select component handle the fallback.

---

## Technical Implementation Plan

### Change 1: Add Declaration Checkbox Blink Animation (SubmitProposal.tsx)

**Add state variable (around line 107):**
```typescript
const [showBlinkAnimation, setShowBlinkAnimation] = useState(false);
```

**Add useEffect for animation timing (around line 365):**
```typescript
// Blink animation for declaration checkbox on signature tab
useEffect(() => {
  if (activeTab === 'signature' && !declarationAccepted) {
    const startTimer = setTimeout(() => setShowBlinkAnimation(true), 2000);
    const stopTimer = setTimeout(() => setShowBlinkAnimation(false), 5000);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(stopTimer);
    };
  } else {
    setShowBlinkAnimation(false);
  }
}, [activeTab, declarationAccepted]);
```

**Update Checkbox (line 1342):**
```typescript
<Checkbox 
  id="declaration" 
  checked={declarationAccepted} 
  onCheckedChange={(checked) => setDeclarationAccepted(checked as boolean)}
  className={cn(
    "mt-0.5 shrink-0",
    showBlinkAnimation && "animate-checkbox-blink"
  )}
/>
```

---

### Change 2: Default Payment Terms to Entrepreneur's Selection (SubmitProposal.tsx)

**Option A - Change initial state (line 121):**
```typescript
const [paymentTermType, setPaymentTermType] = useState<PaymentTermType | undefined>(undefined);
```

**Option B - Add initialization useEffect (around line 237):**
```typescript
// Initialize payment term type from entrepreneur data
useEffect(() => {
  if (entrepreneurData?.payment_terms?.payment_term_type) {
    setPaymentTermType(entrepreneurData.payment_terms.payment_term_type);
  }
}, [entrepreneurData]);
```

I recommend **Option B** as it preserves existing behavior while properly initializing from entrepreneur data.

---

## Validation Result

| Feature | Status | Action Required |
|---------|--------|-----------------|
| **Declaration Checkbox Blink Animation** | ⚠️ Partial | Add blink animation to SubmitProposal.tsx (same pattern as ProposalApprovalDialog) |
| **Default Payment Terms from Entrepreneur** | ⚠️ Partial | Add useEffect to initialize paymentTermType from entrepreneurData |

Both features require implementation. The infrastructure exists (blink animation CSS, payment terms constants) but the logic isn't connected in `SubmitProposal.tsx`.
