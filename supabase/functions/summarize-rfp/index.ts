import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SummarizeRequest {
  project_name: string;
  project_type: string;
  project_location: string;
  project_description: string;
  project_phase: string;
  request_title?: string;
  request_content?: string;
  advisor_type?: string;
  advisor_expertise?: string[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('[summarize-rfp] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: SummarizeRequest = await req.json();
    console.log('[summarize-rfp] Request received for project:', data.project_name);

    // Build context for AI
    const projectContext = `
פרויקט: ${data.project_name}
סוג: ${data.project_type || 'לא צוין'}
מיקום: ${data.project_location || 'לא צוין'}
שלב: ${data.project_phase || 'לא צוין'}
תיאור: ${data.project_description || 'אין תיאור'}
${data.request_title ? `כותרת הבקשה: ${data.request_title}` : ''}
${data.request_content ? `תוכן הבקשה: ${data.request_content}` : ''}
${data.advisor_type ? `סוג היועץ המבוקש: ${data.advisor_type}` : ''}
`.trim();

    const systemPrompt = `אתה עוזר לייעוץ עסקי ישראלי. תפקידך לספק סיכום קצר וממוקד של בקשה להצעת מחיר (RFP) ליועץ.

הנחיות:
1. כתוב בעברית תקנית ומקצועית
2. הסיכום צריך להיות בין 2-4 משפטים קצרים
3. התמקד בעיקר: מה הפרויקט, מה מבקשים מהיועץ, ומה חשוב לדעת
4. אם יש מידע על התמחות היועץ, הדגש את הרלוונטיות
5. השתמש בנקודות או כותרות משנה אם זה עוזר לבהירות
6. אל תכלול מידע שלא סופק`;

    const userPrompt = `סכם את בקשת ההצעת מחיר הבאה ליועץ:

${projectContext}

${data.advisor_expertise?.length ? `התמחויות היועץ: ${data.advisor_expertise.join(', ')}` : ''}

ספק סיכום קצר וממוקד שיעזור ליועץ להבין מהר אם הפרויקט רלוונטי עבורו.`;

    console.log('[summarize-rfp] Calling Lovable AI...');
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[summarize-rfp] AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "שירות ה-AI עמוס כרגע, נסה שוב בעוד דקה" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "שירות ה-AI לא זמין כרגע" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "שגיאה בשירות ה-AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      console.error('[summarize-rfp] No summary in response');
      return new Response(
        JSON.stringify({ error: "לא התקבל סיכום מה-AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[summarize-rfp] Summary generated successfully');

    return new Response(
      JSON.stringify({ summary }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[summarize-rfp] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "שגיאה בלתי צפויה" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
