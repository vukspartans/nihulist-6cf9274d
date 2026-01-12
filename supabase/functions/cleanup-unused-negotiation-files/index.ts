import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find files uploaded > 24 hours ago that were never used (no session_id, no used_at)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log(`[Cleanup] Finding orphaned files uploaded before: ${cutoffTime}`);

    const { data: orphanedFiles, error: queryError } = await supabase
      .from("negotiation_files")
      .select("id, storage_path, original_name")
      .is("session_id", null)
      .is("used_at", null)
      .lt("uploaded_at", cutoffTime);

    if (queryError) {
      console.error("[Cleanup] Query error:", queryError);
      throw new Error(`Failed to query orphaned files: ${queryError.message}`);
    }

    if (!orphanedFiles || orphanedFiles.length === 0) {
      console.log("[Cleanup] No orphaned files found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No orphaned files to clean up",
          cleaned: 0 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`[Cleanup] Found ${orphanedFiles.length} orphaned files to clean up`);

    // Delete files from storage
    const storagePaths = orphanedFiles.map((f) => f.storage_path);
    const { error: storageError } = await supabase.storage
      .from("negotiation-files")
      .remove(storagePaths);

    if (storageError) {
      console.error("[Cleanup] Storage deletion error:", storageError);
      // Continue to delete DB records anyway
    } else {
      console.log(`[Cleanup] Deleted ${storagePaths.length} files from storage`);
    }

    // Delete records from database
    const fileIds = orphanedFiles.map((f) => f.id);
    const { error: deleteError } = await supabase
      .from("negotiation_files")
      .delete()
      .in("id", fileIds);

    if (deleteError) {
      console.error("[Cleanup] Database deletion error:", deleteError);
      throw new Error(`Failed to delete file records: ${deleteError.message}`);
    }

    console.log(`[Cleanup] Deleted ${fileIds.length} file records from database`);

    // Log cleanup activity
    await supabase.from("activity_log").insert({
      actor_id: null,
      actor_type: "system",
      action: "cleanup_negotiation_files",
      entity_type: "negotiation_files",
      entity_id: null,
      meta: {
        files_cleaned: orphanedFiles.length,
        file_names: orphanedFiles.map((f) => f.original_name),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${orphanedFiles.length} orphaned files`,
        cleaned: orphanedFiles.length,
        files: orphanedFiles.map((f) => f.original_name),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Cleanup] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
