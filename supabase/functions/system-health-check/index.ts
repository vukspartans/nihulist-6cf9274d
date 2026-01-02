import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceStatus {
  status: "healthy" | "degraded" | "down";
  latency_ms?: number;
  provider?: string;
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[Health Check] Starting system health check...");

  const results: {
    database: ServiceStatus;
    ai: ServiceStatus;
    email: ServiceStatus;
    storage: ServiceStatus;
    checked_at: string;
  } = {
    database: { status: "down" },
    ai: { status: "down" },
    email: { status: "down" },
    storage: { status: "down" },
    checked_at: new Date().toISOString(),
  };

  // Check Database
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      results.database = { status: "down", message: "Missing credentials" };
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const startTime = Date.now();
      
      const { error } = await supabase.from("profiles").select("id").limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        console.error("[Health Check] Database error:", error.message);
        results.database = { status: "down", message: error.message };
      } else {
        results.database = { status: "healthy", latency_ms: latency };
      }
    }
  } catch (error) {
    console.error("[Health Check] Database check failed:", error);
    results.database = { status: "down", message: "Connection failed" };
  }

  // Check AI Service
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");

    if (openaiKey) {
      results.ai = { status: "healthy", provider: "OpenAI" };
    } else if (geminiKey || googleKey) {
      results.ai = { status: "healthy", provider: "Gemini" };
    } else {
      results.ai = { status: "degraded", message: "No API key configured" };
    }
  } catch (error) {
    console.error("[Health Check] AI check failed:", error);
    results.ai = { status: "down", message: "Check failed" };
  }

  // Check Email Service (Resend)
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (resendKey) {
      results.email = { status: "healthy", provider: "Resend" };
    } else {
      results.email = { status: "degraded", message: "No API key configured" };
    }
  } catch (error) {
    console.error("[Health Check] Email check failed:", error);
    results.email = { status: "down", message: "Check failed" };
  }

  // Check Storage
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      results.storage = { status: "down", message: "Missing credentials" };
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: buckets, error } = await supabase.storage.listBuckets();

      if (error) {
        console.error("[Health Check] Storage error:", error.message);
        results.storage = { status: "down", message: error.message };
      } else {
        results.storage = { 
          status: "healthy", 
          message: `${buckets?.length ?? 0} buckets` 
        };
      }
    }
  } catch (error) {
    console.error("[Health Check] Storage check failed:", error);
    results.storage = { status: "down", message: "Connection failed" };
  }

  console.log("[Health Check] Results:", JSON.stringify(results));

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
