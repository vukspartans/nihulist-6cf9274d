

# Normalize Logo Sizes Across All Top Bars

## Problem
The homepage logo is `xl` (68px) but all other pages use `sm` (28px) or `md` (36px), making the logo appear tiny in account dashboards and inner pages.

## Approach
- Use `lg` (48px) as the standard for all inner-page top bars (slightly smaller than homepage `xl` since these are app headers, not marketing)
- On mobile, use `md` (36px) to fit compact headers
- Update the `NavigationLogo` component to have responsive sizing built-in as a default

## Changes

### 1. `src/components/NavigationLogo.tsx` -- Add responsive default sizing
- Change default `size` to respond to screen width: `md` on mobile, `lg` on desktop
- Add a `mobileSize` prop so pages can override if needed
- Use the existing `useIsMobile` hook for responsive behavior

### 2. Update all pages to use consistent sizing

**Pages using `NavigationLogo` (9 files):**
- `src/pages/Dashboard.tsx` -- change `size="sm"` to `size="lg"` (remove mobile override, let NavigationLogo handle it)
- `src/pages/AdvisorDashboard.tsx` -- change from manual `isMobile ? "sm" : "md"` to just `size="lg"` with built-in responsive
- `src/pages/Profile.tsx` (2 instances) -- change `size="sm"` to `size="lg"`
- `src/pages/AccountantDashboard.tsx` -- change `size="sm"` to `size="lg"`
- `src/pages/NegotiationResponse.tsx` (3 instances) -- change `size="sm"` to `size="lg"`
- `src/pages/ProjectDetail.tsx` -- change `size="md"` to `size="lg"`
- `src/pages/SubmitProposal.tsx` -- change `size="md"` to `size="lg"`
- `src/pages/RFPDetails.tsx` -- change `size="md"` to `size="lg"`
- `src/pages/OrganizationOnboarding.tsx` -- change `size="sm"` to `size="lg"`

**Pages using `Logo` directly (2 files):**
- `src/pages/ForEntrepreneurs.tsx` -- change `size="sm"` to `size="xl"`, remove `className="sm:h-10"` override
- `src/pages/ForConsultants.tsx` -- change `size="sm"` to `size="xl"`, remove `className="sm:h-10"` override

### 3. Mobile responsiveness in `NavigationLogo`
Update `NavigationLogo` to automatically use a smaller size on mobile:
- Accept an optional `mobileSize` prop (default: `md`, 36px)
- Use `useIsMobile()` hook to switch between `mobileSize` and the provided `size`
- This ensures all headers look good on small screens without each page needing custom logic

### Size reference after changes
- **Homepage nav**: `xl` (68px) -- marketing, largest
- **Inner pages desktop**: `lg` (48px) -- app headers
- **Inner pages mobile**: `md` (36px) -- compact mobile headers
- **ForEntrepreneurs/ForConsultants nav**: `xl` (68px) -- marketing pages, match homepage

### Files to modify (12 total)
1. `src/components/NavigationLogo.tsx`
2. `src/pages/Dashboard.tsx`
3. `src/pages/AdvisorDashboard.tsx`
4. `src/pages/Profile.tsx`
5. `src/pages/AccountantDashboard.tsx`
6. `src/pages/NegotiationResponse.tsx`
7. `src/pages/ProjectDetail.tsx`
8. `src/pages/SubmitProposal.tsx`
9. `src/pages/RFPDetails.tsx`
10. `src/pages/OrganizationOnboarding.tsx`
11. `src/pages/ForEntrepreneurs.tsx`
12. `src/pages/ForConsultants.tsx`
