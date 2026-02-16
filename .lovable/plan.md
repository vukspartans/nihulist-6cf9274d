
# Increase Logo Size + Compact Top Bar

## Changes

### 1. Logo size increase (~20%) in `src/components/Logo.tsx`
- Current `xl` is 56px. Increase to 67px (56 * 1.2 = ~67)
- Update the size map: `xl: 67`
- Alternatively, keep size tiers clean and round to 68px

### 2. Compact the nav bar in `src/pages/Landing.tsx`
- Current nav padding: `py-4 sm:py-6` -- reduce to `py-2 sm:py-3` to cut vertical padding roughly in half
- This removes wasted whitespace while still giving the logo breathing room

### Files to modify
- `src/components/Logo.tsx` -- change `xl` height from 56 to 68
- `src/pages/Landing.tsx` -- reduce nav padding from `py-4 sm:py-6` to `py-2 sm:py-3`
