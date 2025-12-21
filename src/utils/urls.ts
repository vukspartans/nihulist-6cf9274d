// Production domain - always use this for external redirects
// This ensures all authentication links point to billding.ai regardless of access domain
export const PRODUCTION_URL = 'https://billding.ai';

// Helper to build full URLs
export const buildUrl = (path: string) => `${PRODUCTION_URL}${path}`;
