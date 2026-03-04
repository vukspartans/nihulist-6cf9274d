

# Fix PDF Export: Logo, Service Names, and Hebrew Units

## Problems Identified

1. **Logo not showing**: `handleExportPDF` in `ProposalDetailDialog.tsx` (line 427) never passes `companyLogoUrl` to the PDF generator. The advisor's `logo_url` is available via `proposal.advisors?.logo_url` but is not mapped.

2. **Services showing as UUID strings**: Line 437 maps `selected_services` as `typeof s === 'string' ? s : s.name`. When services are stored as UUID strings (which they are per the database schema), the raw UUID is passed through. The component already resolves names into the `serviceNames` state (lines 269-292), but the PDF export does not use this lookup.

3. **Units in English**: Line 443 passes `unit: item.unit` raw (e.g. `"lump_sum"`, `"sqm"`). The PDF generator (`generateProposalPDF.ts` line 164) renders `item.unit || 'יחידה'` verbatim. It needs to go through `getFeeUnitLabel()` to translate to Hebrew (e.g. `"קומפ'"`, `"מ"ר"`).

## Plan

### File 1: `src/components/ProposalDetailDialog.tsx` — Fix `handleExportPDF`

- **Logo**: Add `companyLogoUrl: advisorInfo?.logo_url || undefined` to the PDF data object.
- **Services**: Replace the raw map with `serviceNames` lookup: `selectedServices: selectedServices.map(s => { const id = typeof s === 'string' ? s : s.id; return serviceNames[id] || (typeof s === 'string' ? s : s.name || s.description) || id; }).filter(Boolean)`.
- **Units**: Change `unit: item.unit` to `unit: getFeeUnitLabel(item.unit || '')` so English codes are translated to Hebrew before being sent to the PDF.

### File 2: `src/utils/generateProposalPDF.ts` — Defensive Hebrew fallback for units

- In the fee table row builder (around line 164), change `item.unit || 'יחידה'` to use `getFeeUnitLabel` as a fallback, ensuring that even if English codes slip through, they get translated. Import `getFeeUnitLabel` from `@/constants/rfpUnits`.

### File 3: `src/components/AdvisorProposalViewDialog.tsx` — Same fixes for advisor PDF export

Apply the same three fixes (logo, service names, unit translation) to the advisor's PDF export handler to keep both views consistent.

