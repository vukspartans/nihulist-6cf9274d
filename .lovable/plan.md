

# Hide Attached Files from Services Selection View

## Problem
The `ConsultantServicesSelection` component displays attached files in the "בחירת שירותים" (Services) tab. Files should not appear here.

## Fix: `src/components/proposal/ConsultantServicesSelection.tsx`

Remove all file-display logic from this component:

1. **Remove imports**: `FileDown`, `Eye`, `ExternalLink`, `FilePreviewModal`, `safeOpenFile`, `canPreviewFile`
2. **Remove state**: `previewFile` useState
3. **Remove functions**: `handleOpenFile`, `handlePreviewFile`, `renderFileItem`
4. **Remove memo**: `allFiles` useMemo block
5. **Remove from checklist mode** (lines ~220-232): The "קבצים מצורפים" Card and the `FilePreviewModal`
6. **Remove from file mode** (lines ~260-275): The entire file-mode rendering block that shows files — keep only the notes textarea
7. **Remove fallback file display** (lines ~280-310): The block that shows files when no service details exist
8. **Keep**: All checklist selection logic, free_text mode, consultant notes textareas — unchanged

This is purely removing ~80 lines of file-related rendering. No logic changes to service selection or notes.

