import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const splash = document.getElementById('initial-splash');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (splash) {
  requestAnimationFrame(() => {
    splash.classList.add('is-hiding');
    setTimeout(() => splash.remove(), 500);
  });
}

