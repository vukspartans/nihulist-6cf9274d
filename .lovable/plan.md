

# Update PostHog Credentials

## Changes

### `src/lib/posthog.ts`

Update two constants:
- **API Key**: `phc_JmOBbXFGBxMfRMtarlJnYMRixudAjyxJzMBx1JiP9es` → `phc_jswXBJtTmjPOQgQolkIwwdVs74gFD8F7w0SJADCUXjY`
- **Host**: `https://eu.i.posthog.com` → `https://eu.i.posthog.com` (keep as-is — PostHog EU host is the correct format; `https://app.posthog.com` is the US dashboard URL, not the ingestion endpoint)

Note: PostHog API keys are publishable client-side keys, so storing them directly in the codebase is safe.

### Host clarification

The user mentioned two options:
- `https://app.posthog.com` — this is the US ingestion host
- `https://eu.i.posthog.com` — this is the EU ingestion host

The `phc_` key format works with either, but the correct host depends on which region the PostHog project was created in. Since the user listed both, I'll use `https://eu.i.posthog.com` (the EU endpoint) as it was listed and matches the current config. If events don't appear in the dashboard, switching to `https://app.posthog.com` would be the fix.

