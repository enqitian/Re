// Intercept and route benign TensorFlow Lite / XNNPACK Emscripten informational logs
// from console.error to console.info so they don't trigger error overlays or test alarms.
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('INFO: Created TensorFlow Lite') ||
     args[0].includes('XNNPACK delegate') ||
     args[0].includes('GL version: OpenGL ES'))
  ) {
    console.info(...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
