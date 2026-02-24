import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { withCronSecurity } from '../_shared/cron-auth.ts';

serve(withCronSecurity('cleanup-unused-negotiation-files', async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  console.log(`[Cleanup] Finding orphaned files uploaded before: ${cutoffTime}`);

  const { data: orphanedFiles, error: queryError } = await supabase
    .from("negotiation_files")
    .select("id, storage_path, original_name")
    .is("session_id", null)
    .is("used_at", null)
    .lt("uploaded_at", cutoffTime);

  if (queryError) throw new Error(`Failed to query orphaned files: ${queryError.message}`);

  if (!orphanedFiles || orphanedFiles.length === 0) {
    console.log("[Cleanup] No orphaned files found");
    return new Response(
      JSON.stringify({ success: true, message: "No orphaned files to clean up", cleaned: 0 }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`[Cleanup] Found ${orphanedFiles.length} orphaned files to clean up`);

  const storagePaths = orphanedFiles.map((f) => f.storage_path);
  const { error: storageError } = await supabase.storage
    .from("negotiation-files")
    .remove(storagePaths);

  if (storageError) {
    console.error("[Cleanup] Storage deletion error:", storageError);
  } else {
    console.log(`[Cleanup] Deleted ${storagePaths.length} files from storage`);
  }

  const fileIds = orphanedFiles.map((f) => f.id);
  const { error: deleteError } = await supabase
    .from("negotiation_files")
    .delete()
    .in("id", fileIds);

  if (deleteError) throw new Error(`Failed to delete file records: ${deleteError.message}`);

  console.log(`[Cleanup] Deleted ${fileIds.length} file records from database`);

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
    { headers: { "Content-Type": "application/json" } }
  );
}));
