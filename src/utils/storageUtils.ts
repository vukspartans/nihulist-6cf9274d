/**
 * PHASE 3: Storage Utilities
 * Signed URL generation for secure file access
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Generate signed URL for proposal files
 */
export const getProposalFileSignedUrl = async (
  proposalId: string,
  fileName: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string | null> => {
  try {
    const filePath = `${proposalId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('proposal-files')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('[Storage] Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[Storage] Unexpected error:', error);
    return null;
  }
};

/**
 * Generate signed URLs for multiple files
 */
export const getProposalFilesSignedUrls = async (
  proposalId: string,
  fileNames: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> => {
  const urlMap = new Map<string, string>();

  await Promise.all(
    fileNames.map(async (fileName) => {
      const url = await getProposalFileSignedUrl(proposalId, fileName, expiresIn);
      if (url) {
        urlMap.set(fileName, url);
      }
    })
  );

  return urlMap;
};

/**
 * Check if file exists in storage
 */
export const checkFileExists = async (
  bucket: string,
  filePath: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.substring(0, filePath.lastIndexOf('/')));

    if (error) return false;

    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    return data.some((file) => file.name === fileName);
  } catch {
    return false;
  }
};
