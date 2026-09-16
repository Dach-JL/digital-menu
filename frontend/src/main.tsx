import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'; // Import the i18n configuration
import { Suspense } from 'react';

// A simple fallback component while translations are loading
const loadingMarkup = (
  <div className="py-4 text-center">
    <h3>Loading...</h3>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={loadingMarkup}>
    <App />
  </Suspense>
);
