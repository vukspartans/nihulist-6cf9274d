/**
 * Safely open a file in a new tab without triggering popup blockers
 * or resetting the current page state.
 * 
 * This uses a programmatic <a> element click approach which:
 * 1. Bypasses popup blockers that block window.open()
 * 2. Prevents the current page from losing React state
 * 3. Works reliably across all browsers
 */
export const safeOpenFile = (url: string, fileName?: string): void => {
  if (!url) {
    console.warn('[safeOpenFile] No URL provided');
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  
  // For download behavior (optional)
  if (fileName) {
    link.download = fileName;
  }
  
  // Append, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Get the file type category for preview purposes
 */
export const getFileCategory = (fileName: string): 'image' | 'pdf' | 'other' => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return 'image';
  }
  
  if (ext === 'pdf') {
    return 'pdf';
  }
  
  return 'other';
};

/**
 * Check if a file can be previewed in-browser
 */
export const canPreviewFile = (fileName: string): boolean => {
  const category = getFileCategory(fileName);
  return category === 'image' || category === 'pdf';
};
