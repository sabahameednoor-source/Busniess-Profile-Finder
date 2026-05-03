import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill global for libraries that expect it (can help with fetch/window getter issues)
if (typeof window !== 'undefined' && !window.global) {
  (window as any).global = window;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
