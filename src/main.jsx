import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { WorkshopProvider } from './workshop/state.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WorkshopProvider>
      <App />
    </WorkshopProvider>
  </StrictMode>,
);
