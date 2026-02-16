

# Fix Logo Sizes on Landing Page

## Problems Identified
1. **Top navigation bar**: Logo uses `size="sm"` (28px) which is too small for a header logo with the new SVG format
2. **Hero section**: The logo is placed as a standalone element above the headline text, which looks disconnected and awkward -- it should be removed from the hero since the branding is already in the nav bar
3. **Footer**: Logo at `size="lg"` (48px) is fine

## Changes

### 1. Navigation bar logo -- increase size (`src/pages/Landing.tsx`, line 118)
- Change `size="sm"` to `size="md"` (36px height) for better visibility
- Remove the `className="sm:h-10"` override since `md` already provides a good size
- This gives the logo proper presence in the top bar without being oversized

### 2. Remove standalone logo from hero section (`src/pages/Landing.tsx`, lines 170-172)
- Remove the `<Logo size="xl" />` block that sits awkwardly above the headline text "מחברים יזמי נדל״ן"
- The logo is already displayed in the navigation bar -- having it twice is redundant and looks odd

### Files to modify
- `src/pages/Landing.tsx` (2 edits)
