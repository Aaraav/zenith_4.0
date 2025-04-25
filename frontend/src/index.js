import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { RoomDetailsProvider } from './RoomContext';
import { ClerkProvider } from '@clerk/clerk-react';
import reportWebVitals from './reportWebVitals';

const VITE_CLERK_PUBLISHABLE_KEY = "pk_test_bGliZXJhbC1tYWNhcXVlLTM0LmNsZXJrLmFjY291bnRzLmRldiQ";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
      <ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
  </React.StrictMode>
);

reportWebVitals();
