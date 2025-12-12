import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Failed to find the root element');
  throw new Error('Failed to find the root element');
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    React.createElement(App)
  );
} catch (error) {
  console.error('Error rendering app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>Error loading game</h1>
      <p>Please check the browser console for details.</p>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}