

# Replace Billding Logo Across the App

## Overview
Replace the current text-based "Billding" logo with the new SVG logo throughout the application, emails, and favicon.

## Logo Placements to Update

### 1. Core Logo Component (`src/components/Logo.tsx`)
- Currently renders the word "Billding" as styled text
- Replace with the uploaded SVG as an inline React component
- Support size variants (xs, sm, md, lg, xl) mapped to appropriate pixel heights (e.g., xs=20px, sm=28px, md=36px, lg=48px, xl=64px)
- Support `variant="white"` by applying a CSS filter or providing a white version of the SVG paths
- The SVG has a blue icon mark on the left + "Billding" wordmark in black -- the white variant will turn all fills to white

### 2. Navigation Logo (`src/components/NavigationLogo.tsx`)
- No changes needed -- it wraps `Logo` component, so it will automatically pick up the new design

### 3. Pages Using `<Logo>` Directly
These pages import and render `Logo` with various sizes:
- **Landing.tsx** -- header (size="sm"), footer (size="lg", variant="white"), hero section gradient text "Billding"
- **ForEntrepreneurs.tsx** -- header (size="sm")
- **ForConsultants.tsx** -- header (size="sm")

### 4. Pages Using `<NavigationLogo>`
These will automatically update via the Logo component:
- Dashboard.tsx, AdvisorDashboard.tsx, ProjectDetail.tsx, RFPDetails.tsx, SubmitProposal.tsx, NegotiationResponse.tsx, Profile.tsx, AccountantDashboard.tsx, OrganizationOnboarding.tsx

### 5. Landing Page Hero Text
- Line 171: `<span className="gradient-text">Billding</span>` -- replace with the actual logo SVG rendered at a larger size to match the hero section aesthetic

### 6. Auth Page (`src/pages/Auth.tsx`)
- Currently has no logo in the auth card -- no change needed unless desired

### 7. Admin Layout (`src/components/admin/AdminLayout.tsx`)
- Shows a Shield icon + "פאנל ניהול" text in the sidebar header
- No Billding logo currently shown here -- skip unless requested

### 8. Email Templates (`supabase/functions/_shared/email-templates/layout.tsx`)
- References `billding-logo.png` from Supabase Storage
- The new logo PNG will need to be uploaded to the `email-assets` storage bucket manually
- Update the `width` attribute if the aspect ratio changes (the SVG is 754x197, roughly 3.8:1)

### 9. Favicon (`public/favicon.png`)
- Generate a square favicon from the blue icon mark portion of the SVG (the geometric "B" shape on the left)
- Save as `public/favicon.png`

## Technical Approach

### File Changes

1. **Copy SVG to project**: `src/assets/billding-logo.svg`
2. **Create white variant**: `src/assets/billding-logo-white.svg` (all fills changed to white)
3. **Rewrite `Logo.tsx`**: Import SVG as image, render with height-based sizing
4. **Update Landing.tsx hero**: Replace the gradient text `Billding` span with the Logo component at xl size
5. **Favicon**: Copy the icon-mark portion as a standalone SVG, use it as favicon

### Size Mapping
```text
xs  -> height: 20px  (compact nav elements)
sm  -> height: 28px  (page headers, mobile nav)
md  -> height: 36px  (default navigation)
lg  -> height: 48px  (footer, larger displays)
xl  -> height: 56px  (hero section)
```

### Email Logo
- Requires manually uploading the new logo PNG to Supabase Storage bucket `email-assets`
- The template code will be updated to match the new image dimensions

