import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import mammoth from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const isExcel = mimeType.includes("excel") || mimeType.includes("spreadsheet") || 
                   fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls");

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
        {
          text: `אתה מנתח מסמכי בקשה להצעות מחיר (RFP) בתחום הבנייה והנדסה בישראל.

מהמסמך המצורף, חלץ את "תוכן הבקשה" או "תיאור הבקשה" - כלומר את המידע העיקרי שהיזם מבקש מהיועץ.

חפש ספציפית:
- תיאור הפרויקט והיקפו
- דרישות ספציפיות מהיועץ
- לוחות זמנים ומועדים
- תנאים מיוחדים
- היקף העבודה הנדרש
- מפרטים טכניים

החזר את התוכן בעברית, מסודר ומפורמט בצורה ברורה.
אם יש פריטים רבים, סדר אותם ברשימה מנוקדת.
אל תוסיף מידע שלא מופיע במסמך.
אם לא מצאת תוכן רלוונטי, ציין זאת.`,
        },
      ];

      console.log("[extract-rfp-content] Using Gemini vision for:", isPDF ? "PDF" : "Image");
    } else if (isDocx) {
      // For DOCX, use mammoth to properly extract text
      console.log("[extract-rfp-content] Using mammoth for DOCX extraction");
      
      try {
        const result = await mammoth.extractRawText({ 
          buffer: new Uint8Array(fileData) 
        });
        extractedText = result.value;
        console.log("[extract-rfp-content] Mammoth extracted text length:", extractedText.length);
      } catch (mammothError) {
        console.error("[extract-rfp-content] Mammoth extraction error:", mammothError);
        extractedText = "";
      }

      if (!extractedText.trim()) {
        extractedText = "לא ניתן לחלץ טקסט מקובץ DOCX זה. אנא העלה קובץ PDF או תמונה.";
      }

      parts = [
        {
          text: `אתה מנתח מסמכי בקשה להצעות מחיר (RFP) בתחום הבנייה והנדסה בישראל.

מהטקסט הבא שחולץ מהמסמך, חלץ את "תוכן הבקשה" או "תיאור הבקשה":

${extractedText}

חפש ספציפית:
- תיאור הפרויקט והיקפו
- דרישות ספציפיות מהיועץ
- לוחות זמנים ומועדים
- תנאים מיוחדים
- היקף העבודה הנדרש

החזר את התוכן בעברית, מסודר ומפורמט בצורה ברורה.`,
        },
      ];

      console.log("[extract-rfp-content] DOCX text extracted, length:", extractedText.length);
    } else {
      // For other text files
      const textDecoder = new TextDecoder("utf-8");
      extractedText = textDecoder.decode(new Uint8Array(fileData));

      parts = [
        {
          text: `אתה מנתח מסמכי בקשה להצעות מחיר (RFP) בתחום הבנייה והנדסה בישראל.

מהטקסט הבא, חלץ את "תוכן הבקשה" או "תיאור הבקשה":

${extractedText}

חפש ספציפית:
- תיאור הפרויקט והיקפו
- דרישות ספציפיות מהיועץ
- לוחות זמנים ומועדים
- תנאים מיוחדים
- היקף העבודה הנדרש

החזר את התוכן בעברית, מסודר ומפורמט בצורה ברורה.`,
        },
      ];

      console.log("[extract-rfp-content] Using text extraction, length:", extractedText.length);
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.2,
          },
          ...(isPDF || isImage ? { mediaResolution: "MEDIA_RESOLUTION_MEDIUM" } : {}),
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
