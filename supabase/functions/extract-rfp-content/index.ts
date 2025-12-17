import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import mammoth from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Concise prompt for short, focused extraction
const EXTRACTION_PROMPT = `אתה מנתח מסמכי RFP בתחום הבנייה והנדסה.

## משימה
חלץ "תיאור הבקשה" בצורה **קצרה וממוקדת** (עד 150 מילים).

## מה לחלץ
- תיאור קצר של הפרויקט (2-3 משפטים)
- מה נדרש מהיועץ (רשימה קצרה)
- היקף עיקרי אם צוין

## חשוב
- תמציתי וקצר
- נקודות לרשימות
- אל תוסיף מידע שלא במסמך
- אם אין מידע רלוונטי: "לא נמצא תיאור בקשה במסמך"`;

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

      parts = [
        {
          text: `${EXTRACTION_PROMPT}

## תוכן המסמך:
${extractedText}`,
        },
      ];

      console.log("[extract-rfp-content] DOCX text extracted, length:", extractedText.length);
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
