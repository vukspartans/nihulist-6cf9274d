import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initPostHog } from '@/lib/posthog';

// Set RTL direction and Hebrew language globally
document.documentElement.dir = "rtl";
document.documentElement.lang = "he";

// Initialize PostHog analytics
initPostHog();

createRoot(document.getElementById("root")!).render(<App />);
