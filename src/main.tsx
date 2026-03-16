import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './utils/logger'; // must be first — suppresses console.log in production
import { initSentry } from './utils/sentry';
import App from './App.tsx';
import './index.css';

initSentry(); // no-op when VITE_SENTRY_DSN is not set

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
