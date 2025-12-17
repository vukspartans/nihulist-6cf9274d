import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import mammoth from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System Prompt – RFQ Outreach Generator
const EXTRACTION_PROMPT = `You are an AI assistant that converts long, formal RFQ / scope documents into short supplier outreach messages.

## Your Goal
Create a concise, professional outreach message that can be sent via email or WhatsApp to suppliers, explaining:
- What the project is
- What services are required
- What the supplier is expected to provide
- What the next step is

The output must be short, clear, and action-oriented.

## Input
You will receive:
- A long RFQ, scope of work, or planning document
- The document may be legal, repetitive, or overly detailed

## Output Requirements
You must generate:
- A short outreach message in the same language as the input document
- Written in plain, business-oriented language
- Suitable for first contact with a supplier

## Structure to Follow (Mandatory)

**Subject line**
Short and factual. Include role + general project location or type.

**Opening sentence**
One sentence explaining:
- Who is managing the project
- What kind of project it is
- What type of supplier is needed

**Scope summary (bullet points)**
3–5 bullets max.
Summarize only the core responsibilities, such as:
- Planning / execution / supervision
- Coordination with other stakeholders
- Deliverables (plans, specs, BOQs, estimates, etc.)
Ignore legal clauses, insurance language, and payment schedules.

**Supplier requirements**
2–4 bullets max, such as:
- Fixed / lump-sum pricing
- Relevant experience
- Availability or involvement level

**Call to action**
A short closing line explaining the next step, e.g.:
- Full RFQ will be sent if relevant
- Ask for confirmation of interest

## Hard Rules
- Do not copy text verbatim from the document
- Do not include personal names, signatures, or company footers
- Do not include legal language or excessive detail
- Do not exceed ~120–150 words total
- No marketing language, no emojis, no hype

## Tone
- Professional
- Direct
- Efficient
- Neutral and business-focused

## Primary Success Criteria
A supplier should be able to read the output in under 20 seconds and immediately understand:
- Is this relevant to me?
- What am I being asked to do?
- What should I reply?

OUTPUT THE MESSAGE DIRECTLY WITHOUT ANY PREAMBLE OR EXPLANATION.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, filePath } = await req.json();
    
    console.log("[extract-rfp-content] Starting extraction:", { fileUrl: fileUrl?.substring(0, 50), filePath });

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the file content
    let fileData: ArrayBuffer;
    let mimeType: string;
    let fileName: string;

    if (filePath) {
      // Download from Supabase storage
      console.log("[extract-rfp-content] Downloading from storage:", filePath);
      const { data, error } = await supabase.storage
        .from("rfp-request-files")
        .download(filePath);

      if (error || !data) {
        console.error("[extract-rfp-content] Storage download error:", error);
        throw new Error(`Failed to download file: ${error?.message}`);
      }

      fileData = await data.arrayBuffer();
      fileName = filePath.split("/").pop() || "document";
      mimeType = data.type || "application/octet-stream";
    } else if (fileUrl) {
      // Fetch from URL
      console.log("[extract-rfp-content] Fetching from URL");
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      fileData = await response.arrayBuffer();
      mimeType = response.headers.get("content-type") || "application/octet-stream";
      fileName = "document";
    } else {
      throw new Error("Either fileUrl or filePath must be provided");
    }

    console.log("[extract-rfp-content] File info:", {
      fileName,
      mimeType,
      size: fileData.byteLength,
    });

    // Determine file type and prepare for Gemini
    const isPDF = mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
    const isImage = mimeType.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)$/i.test(fileName);
    const isDocx = mimeType.includes("word") || fileName.toLowerCase().endsWith(".docx");

    let extractedText = "";
    let parts: any[] = [];

    // For PDF and images, use Gemini's native vision
    if (isPDF || isImage) {
      const base64Data = btoa(
        new Uint8Array(fileData).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const geminiMimeType = isPDF ? "application/pdf" : mimeType;

      parts = [
        {
          inlineData: {
            mimeType: geminiMimeType,
            data: base64Data,
          },
        },
        { text: EXTRACTION_PROMPT },
      ];

      console.log("[extract-rfp-content] Using Gemini vision for:", isPDF ? "PDF" : "Image");
    } else if (isDocx) {
      // For DOCX, use mammoth to properly extract text
      console.log("[extract-rfp-content] Using mammoth for DOCX extraction");
      
      try {
        const result = await mammoth.extractRawText({ 
          arrayBuffer: fileData 
        });
        extractedText = result.value;
        console.log("[extract-rfp-content] Mammoth extracted text length:", extractedText.length);
        console.log("[extract-rfp-content] Mammoth text preview:", extractedText.substring(0, 500));
      } catch (mammothError) {
        console.error("[extract-rfp-content] Mammoth extraction error:", mammothError);
        extractedText = "";
      }

      if (!extractedText.trim()) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "לא ניתן לחלץ טקסט מקובץ DOCX זה. אנא העלה קובץ PDF או תמונה.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Pass extracted DOCX text to Gemini for analysis
      parts = [
        {
          text: `${EXTRACTION_PROMPT}

## תוכן המסמך:
${extractedText}`,
        },
      ];

      console.log("[extract-rfp-content] DOCX text extracted, sending to Gemini for analysis, length:", extractedText.length);
    } else {
      // For other text files
      const textDecoder = new TextDecoder("utf-8");
      extractedText = textDecoder.decode(new Uint8Array(fileData));

      parts = [
        {
          text: `${EXTRACTION_PROMPT}

## תוכן המסמך:
${extractedText}`,
        },
      ];

      console.log("[extract-rfp-content] Using text extraction, length:", extractedText.length);
    }

    // Call Gemini 3 Pro Preview API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": GOOGLE_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.2,
            mediaResolution: "MEDIA_RESOLUTION_MEDIUM",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("[extract-rfp-content] Gemini API error:", geminiResponse.status, errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log("[extract-rfp-content] Gemini response received");

    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error("[extract-rfp-content] No content in Gemini response:", geminiData);
      throw new Error("No content extracted from document");
    }

    console.log("[extract-rfp-content] Extraction successful, content length:", content.length);

    return new Response(
      JSON.stringify({
        success: true,
        content: content.trim(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[extract-rfp-content] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
