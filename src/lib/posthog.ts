import posthog from 'posthog-js';

const POSTHOG_API_KEY = 'phc_jswXBJtTmjPOQgQolkIwwdVs74gFD8F7w0SJADCUXjY';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

let initialized = false;

export function initPostHog() {
  try {
    if (initialized) return;
    posthog.init(POSTHOG_API_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-no-capture]',
      },
      persistence: 'localStorage+cookie',
      disable_session_recording: false,
    });
    initialized = true;
    console.log('[PostHog] Initialized');
  } catch (error) {
    console.error('[PostHog] Init failed:', error);
  }
}

export function identifyUser(userId: string, properties?: Record<string, any>) {
  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error('[PostHog] Identify failed:', error);
  }
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  try {
    posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[PostHog] Track failed:', error);
  }
}

export function resetPostHog() {
  try {
    posthog.reset();
  } catch (error) {
    console.error('[PostHog] Reset failed:', error);
  }
}

export { posthog };
