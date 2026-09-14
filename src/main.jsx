import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import { registerSW } from 'virtual:pwa-register';

// Service worker: de app werkt offline, en een nieuwe versie geldt bij de volgende start.
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
