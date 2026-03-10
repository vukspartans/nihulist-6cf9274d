

# Track PostHog Only in Production (billding.ai)

## Change

**File: `src/lib/posthog.ts`**

Add a production check before initializing PostHog. Use `import.meta.env.PROD` combined with a hostname check for `billding.ai` to ensure analytics only run on the production domain.

```ts
export function initPostHog() {
  try {
    if (initialized) return;
    
    // Only track in production on billding.ai
    const isProduction = import.meta.env.PROD && window.location.hostname === 'billding.ai';
    if (!isProduction) {
      console.log('[PostHog] Skipped — not production');
      return;
    }
    
    posthog.init(POSTHOG_API_KEY, { ... });
    ...
  }
}
```

The same guard applies implicitly to `identifyUser`, `trackEvent`, and `resetPostHog` since they call `posthog` methods which are no-ops when not initialized.

No other files need changes.

