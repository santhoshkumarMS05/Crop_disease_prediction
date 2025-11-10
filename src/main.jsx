import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import icon from './assets/icon.jpg'; // adjust extension if needed

// Dynamically set favicon
const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/png'; // or 'image/svg+xml'
link.href = icon;
document.head.appendChild(link);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
