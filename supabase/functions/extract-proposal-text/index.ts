import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTRACTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface ExtractRequest {
  proposal_id: string;
  force_re_extract?: boolean;
}

// Helper to calculate SHA256 hash
async function calculateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Extract text from PDF using a simple approach
// Note: For production, consider using a proper PDF library or external service
async function extractFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  // For MVP, we'll use a simple text extraction
  // This is a basic implementation - for production, use pdfjs-dist or similar
  try {
    // Try to extract text using TextDecoder (works for some PDFs)
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = decoder.decode(arrayBuffer);
    
    // Remove binary data and keep only readable text
    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    
    // Extract text between common PDF text markers
    const textMatches = text.match(/\((.*?)\)/g) || [];
    const extracted = textMatches
      .map(match => match.slice(1, -1)) // Remove parentheses
      .filter(t => t.length > 2) // Filter short strings
      .join(' ');
    
    if (extracted.length > 100) {
      return extracted;
    }
    
    // Fallback: return a note that extraction was limited
    return `[PDF Text Extraction: Limited extraction capability. Full text may require manual review.]`;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Extract text from DOCX
async function extractFromDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // For MVP, we'll use a simple approach
    // DOCX files are ZIP archives containing XML
    // We can try to extract text from the main document XML
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = decoder.decode(arrayBuffer);
    
    // Extract text from XML-like structures
    const textMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
    const extracted = textMatches
      .map(match => {
        const matchResult = match.match(/<w:t[^>]*>([^<]+)<\/w:t>/);
        return matchResult ? matchResult[1] : '';
      })
      .filter(t => t.trim().length > 0)
      .join(' ');
    
    if (extracted.length > 50) {
      return extracted;
    }
    
    return `[DOCX Text Extraction: Limited extraction capability. Full text may require manual review.]`;
  } catch (error) {
    console.error('DOCX extraction error:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

// Main extraction function
async function extractTextFromFile(
  filePath: string,
  mimeType: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  console.log(`[Extract] Downloading file: ${filePath}, type: ${mimeType}`);
  
  // Download file from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('proposal-files')
    .download(filePath);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
  }

  const arrayBuffer = await fileData.arrayBuffer();
  console.log(`[Extract] File downloaded, size: ${arrayBuffer.byteLength} bytes`);

  // Route to appropriate extractor
  if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
    return await extractFromPDF(arrayBuffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    filePath.toLowerCase().endsWith('.docx')
  ) {
    return await extractFromDOCX(arrayBuffer);
  } else if (mimeType === 'application/msword' || filePath.toLowerCase().endsWith('.doc')) {
    // Old DOC format - try DOCX extraction
    return await extractFromDOCX(arrayBuffer);
  } else {
    // For other file types, try generic text extraction
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(arrayBuffer);
    // Return first 10000 characters of readable text
    return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '').slice(0, 10000);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { proposal_id, force_re_extract = false }: ExtractRequest = await req.json();

    if (!proposal_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'proposal_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[Extract] Starting extraction for proposal: ${proposal_id}`);

    // Fetch proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, files, scope_text, extracted_text, extracted_text_hash')
      .eq('id', proposal_id)
      .single();

    if (proposalError || !proposal) {
      return new Response(
        JSON.stringify({ success: false, error: 'Proposal not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if extraction already exists and hash matches (unless force re-extract)
    if (!force_re_extract && proposal.extracted_text && proposal.extracted_text_hash) {
      console.log(`[Extract] Extraction already exists for proposal ${proposal_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          proposal_id,
          extracted_text_length: proposal.extracted_text.length,
          extracted_text_hash: proposal.extracted_text_hash,
          files_processed: 0,
          extraction_time_ms: 0,
          cached: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get files array
    const files = (proposal.files as any[]) || [];
    if (files.length === 0) {
      // No files - use scope_text as fallback
      const fallbackText = proposal.scope_text || '';
      const hash = await calculateHash(fallbackText);
      
      const { error: updateError } = await supabase
        .from('proposals')
        .update({
          extracted_text: fallbackText,
          extracted_text_hash: hash,
          extracted_at: new Date().toISOString(),
        })
        .eq('id', proposal_id);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          proposal_id,
          extracted_text_length: fallbackText.length,
          extracted_text_hash: hash,
          files_processed: 0,
          extraction_time_ms: 0,
          fallback_used: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract text from all files
    const startTime = Date.now();
    const extractedTexts: string[] = [];
    let filesProcessed = 0;

    for (const file of files) {
      try {
        const filePath = file.url || file.path;
        const mimeType = file.mime || file.type || 'application/octet-stream';
        
        if (!filePath) {
          console.warn(`[Extract] Skipping file without path:`, file);
          continue;
        }

        console.log(`[Extract] Processing file: ${filePath}`);
        const text = await extractTextFromFile(filePath, mimeType, supabase);
        extractedTexts.push(`[File: ${file.name || filePath}]\n${text}`);
        filesProcessed++;
      } catch (error) {
        console.error(`[Extract] Error extracting from file ${file.name}:`, error);
        // Continue with other files
        extractedTexts.push(`[File: ${file.name || 'unknown'} - Extraction failed: ${error.message}]`);
      }
    }

    // Combine all extracted text
    let fullText = extractedTexts.join('\n\n---\n\n');
    
    // If no text extracted, use scope_text as fallback
    if (fullText.trim().length < 50 && proposal.scope_text) {
      console.log(`[Extract] Using scope_text as fallback`);
      fullText = proposal.scope_text;
    }

    // Calculate hash
    const hash = await calculateHash(fullText);
    const extractionTime = Date.now() - startTime;

    // Update proposal
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        extracted_text: fullText,
        extracted_text_hash: hash,
        extracted_at: new Date().toISOString(),
      })
      .eq('id', proposal_id);

    if (updateError) {
      throw updateError;
    }

    console.log(`[Extract] Extraction completed in ${extractionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        proposal_id,
        extracted_text_length: fullText.length,
        extracted_text_hash: hash,
        files_processed: filesProcessed,
        extraction_time_ms: extractionTime,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Extract] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
        error_code: 'EXTRACTION_FAILED',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


