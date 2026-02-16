

# Increase Logo Sizes: Homepage Mobile + Inner Page Top Bars

## What Changes

1. **Homepage mobile logo**: Currently 68px (`xl`), increase by 25% to **85px**
2. **Inner page top bars (entrepreneur/vendor dashboards)**:
   - Desktop: Currently 48px (`lg`), increase by 50% to **72px**
   - Mobile: Currently 36px (`md`), increase by 50% to **54px**

## Technical Approach

Since the current size tiers don't match these new values, we need to either add new tiers or support numeric heights.

### Option: Add new size tiers to `Logo.tsx`

Add two new sizes to the size map in `src/components/Logo.tsx`:
- `2xl: 85` (for homepage mobile)
- `xl2: 72` (for inner page desktop) -- or better, just update `lg` and `xl` values

**Cleaner approach**: Update existing tier values since they're only used relatively:
- `md`: 36 -> **54** (inner pages mobile)
- `lg`: 48 -> **72** (inner pages desktop)
- `xl`: 68 -> keep 68 for homepage desktop, but need 85 for homepage mobile

This gets complicated with fixed tiers. Best approach: **add a numeric `height` prop override**.

## Plan

### 1. `src/components/Logo.tsx` -- Add optional numeric `height` prop
- Add `height?: number` to `LogoProps`
- When provided, use it directly instead of looking up from the size map
- Keeps backward compatibility with all existing size-based usage

### 2. `src/components/NavigationLogo.tsx` -- Use numeric heights for inner pages
- Change default desktop size from `lg` (48px) to numeric height **72px**
- Change default mobile size from `md` (36px) to numeric height **54px**
- Update props to accept `height` and `mobileHeight` as numbers alongside existing size props

### 3. `src/pages/Landing.tsx` -- Homepage mobile logo at 85px
- The nav logo currently uses `<Logo size="xl" />` (68px on all screens)
- On mobile, override to 85px using the new `height` prop with `useIsMobile`
- Desktop stays at 68px (`xl`)

## Files to modify (3 total)
1. `src/components/Logo.tsx` -- add `height` prop
2. `src/components/NavigationLogo.tsx` -- update defaults to 72px desktop / 54px mobile
3. `src/pages/Landing.tsx` -- use 85px on mobile for nav logo
