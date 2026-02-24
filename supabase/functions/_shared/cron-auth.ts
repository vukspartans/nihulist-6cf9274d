/**
 * Shared cron security layer.
 *
 * Provides two exports:
 *   - validateCronRequest(req)  — low-level auth + replay check
 *   - withCronSecurity(name, handler) — full wrapper (CORS, auth, logging, error handling)
 *
 * Secret rotation:
 *   Checks x-cron-secret against CRON_SECRET_CURRENT first, then CRON_SECRET_PREVIOUS.
 *   Fallback: service role key in Authorization header.
 *
 * Replay protection:
 *   Requires x-cron-timestamp header (unix epoch).
 *   Rejects if |now - timestamp| > 60 seconds (cron_secret auth only).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CronAuthResult {
  isValid: boolean;
  authMethod: 'cron_secret_current' | 'cron_secret_previous' | 'service_role' | 'none';
  timestampDelta: number | null;
  rejectReason?: string;
}

const MAX_TIMESTAMP_DRIFT_SECONDS = 60;

export function validateCronRequest(req: Request): CronAuthResult {
  const secret = req.headers.get('x-cron-secret');
  const current = Deno.env.get('CRON_SECRET_CURRENT');
  const previous = Deno.env.get('CRON_SECRET_PREVIOUS');
  // Backward compat: also check legacy CRON_SECRET
  const legacy = Deno.env.get('CRON_SECRET');

  let authMethod: CronAuthResult['authMethod'] = 'none';

  if (current && secret === current) {
    authMethod = 'cron_secret_current';
  } else if (previous && secret === previous) {
    authMethod = 'cron_secret_previous';
  } else if (legacy && secret === legacy) {
    // Treat legacy as "current" for backward compat during migration
    authMethod = 'cron_secret_current';
  } else {
    // Fallback: service role key in Authorization header
    const authHeader = req.headers.get('authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
      authMethod = 'service_role';
    }
  }

  if (authMethod === 'none') {
    return { isValid: false, authMethod: 'none', timestampDelta: null, rejectReason: 'invalid_secret' };
  }

  // Timestamp replay check (only for cron_secret auth, not service_role)
  let timestampDelta: number | null = null;

  if (authMethod.startsWith('cron_secret')) {
    const tsHeader = req.headers.get('x-cron-timestamp');
    const tsEpoch = tsHeader ? parseFloat(tsHeader) : NaN;
    const nowEpoch = Date.now() / 1000;

    if (isNaN(tsEpoch)) {
      return { isValid: false, authMethod, timestampDelta: null, rejectReason: 'missing_timestamp' };
    }

    timestampDelta = Math.round((nowEpoch - tsEpoch) * 10) / 10; // 1 decimal

    if (Math.abs(timestampDelta) > MAX_TIMESTAMP_DRIFT_SECONDS) {
      return { isValid: false, authMethod, timestampDelta, rejectReason: 'replay_rejected' };
    }
  }

  return { isValid: true, authMethod, timestampDelta };
}

/**
 * Wraps a cron handler with security, CORS, logging, and error handling.
 *
 * Usage:
 *   serve(withCronSecurity('my-function', async (req) => {
 *     // business logic — return Response
 *   }));
 */
export function withCronSecurity(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const authResult = validateCronRequest(req);

    // Structured log
    console.log(JSON.stringify({
      type: 'cron_auth',
      function: functionName,
      authMethod: authResult.authMethod,
      valid: authResult.isValid,
      timestampDelta: authResult.timestampDelta,
      ...(authResult.rejectReason ? { rejectReason: authResult.rejectReason } : {}),
      timestamp: new Date().toISOString(),
    }));

    if (!authResult.isValid) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', reason: authResult.rejectReason }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    try {
      return await handler(req);
    } catch (error: any) {
      console.error(`[${functionName}] Unhandled error:`, error);
      return new Response(
        JSON.stringify({ error: error.message || 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  };
}
