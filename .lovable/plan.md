

# Optimize Top Bar Space in Entrepreneur and Vendor Dashboards

## Problem
The top bars on both the entrepreneur (Dashboard) and vendor (AdvisorDashboard) pages consume excessive vertical space. The combination of a 72px logo on desktop (54px on mobile) and generous padding (`p-6` / 24px on desktop) creates a header that wastes valuable screen real estate for the actual dashboard content.

## Current State
- **Entrepreneur dashboard**: `p-3 md:p-6` padding with 72px logo = ~120px total header height on desktop
- **Vendor dashboard**: `p-4 md:p-6` padding with 72px logo = ~120px total header height on desktop
- Both are sticky headers, so this space is permanently consumed

## Optimization Plan

### 1. Reduce top bar padding on both dashboards
Reduce vertical padding while keeping horizontal padding for content alignment:
- **Desktop**: Change from `p-6` (24px all sides) to `px-6 py-2` (24px horizontal, 8px vertical)
- **Mobile**: Change from `p-3`/`p-4` to `px-3 py-2` (12px horizontal, 8px vertical)

### 2. Reduce inner-page logo height
The 72px/54px sizes are too large for an app header bar. Reduce to a more compact size while still being clearly visible:
- **Desktop**: 72px down to **48px** (the original `lg` tier -- a good app header size)
- **Mobile**: 54px down to **36px** (the original `md` tier)

This keeps the logo prominent while saving ~24px of vertical space on desktop and ~18px on mobile.

### 3. Also optimize other inner-page top bars for consistency
Apply the same compact padding to Profile, AccountantDashboard, and other inner pages that share the same sticky header pattern.

## Files to modify

1. **`src/components/NavigationLogo.tsx`** -- Change default heights from 72/54 back to 48/36 for inner pages
2. **`src/pages/Dashboard.tsx`** -- Reduce top bar padding from `p-3 md:p-6` to `px-3 py-2 md:px-6 md:py-2`
3. **`src/pages/AdvisorDashboard.tsx`** -- Reduce top bar padding from `p-4 md:p-6` to `px-3 py-2 md:px-6 md:py-2`
4. **`src/pages/Profile.tsx`** -- Reduce top bar padding to match (2 instances)
5. **`src/pages/AccountantDashboard.tsx`** -- Reduce top bar padding to match
6. **`src/pages/ProjectDetail.tsx`** -- Reduce top bar padding from `p-6` to `px-6 py-2`

## Expected Result
- Header height drops from ~120px to ~52px on desktop (logo 48px + 4px padding)
- ~70px of vertical space reclaimed on every page
- Homepage logo sizes remain unchanged (85px mobile / 68px desktop)
- Clean, professional app-style header that doesn't compete with content
