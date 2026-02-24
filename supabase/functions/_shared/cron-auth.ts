/**
 * Shared cron security layer.
 *
 * Provides two exports:
 *   - validateCronRequest(req)  — low-level auth + replay check
 *   - withCronSecurity(name, handler) — full wrapper (CORS, auth, logging, error handling)
 *
 * Secret rotation:
 *   Checks x-cron-secret against CRON_SECRET_CURRENT first, then CRON_SECRET_PREVIOUS.
 *   No other fallbacks — service role key and legacy CRON_SECRET are NOT accepted.
 *
 * Replay protection:
 *   Requires x-cron-timestamp header (unix epoch).
 *   Rejects if missing, unparseable, or |now - timestamp| > 60 seconds.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CronAuthResult {
  isValid: boolean;
  authMethod: 'cron_secret_current' | 'cron_secret_previous' | 'none';
  timestampDelta: number | null;
  rejectReason?: string;
}

const MAX_TIMESTAMP_DRIFT_SECONDS = 60;

export function validateCronRequest(req: Request): CronAuthResult {
  const secret = req.headers.get('x-cron-secret');
  const current = Deno.env.get('CRON_SECRET_CURRENT');
  const previous = Deno.env.get('CRON_SECRET_PREVIOUS');

  // Step 1: Secret validation — only CURRENT and PREVIOUS accepted
  if (!secret) {
    return { isValid: false, authMethod: 'none', timestampDelta: null, rejectReason: 'missing_secret_header' };
  }

  let authMethod: CronAuthResult['authMethod'] = 'none';

  if (current && secret === current) {
    authMethod = 'cron_secret_current';
  } else if (previous && secret === previous) {
    authMethod = 'cron_secret_previous';
  } else {
    return { isValid: false, authMethod: 'none', timestampDelta: null, rejectReason: 'invalid_secret' };
  }

  // Step 2: Timestamp validation — required for all authenticated requests
  const tsHeader = req.headers.get('x-cron-timestamp');

  if (tsHeader === null) {
    return { isValid: false, authMethod, timestampDelta: null, rejectReason: 'missing_timestamp' };
  }

  const tsEpoch = parseFloat(tsHeader);

  if (isNaN(tsEpoch)) {
    return { isValid: false, authMethod, timestampDelta: null, rejectReason: 'unparseable_timestamp' };
  }

  const nowEpoch = Date.now() / 1000;
  const timestampDelta = Math.round((nowEpoch - tsEpoch) * 10) / 10;

  if (Math.abs(timestampDelta) > MAX_TIMESTAMP_DRIFT_SECONDS) {
    return { isValid: false, authMethod, timestampDelta, rejectReason: 'replay_rejected' };
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
