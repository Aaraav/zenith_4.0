import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { RoomDetailsProvider } from './RoomContext';
import { ClerkProvider } from '@clerk/clerk-react';
import reportWebVitals from './reportWebVitals';

const CLERK_PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('REACT_APP_CLERK_PUBLISHABLE_KEY is not set in frontend/.env');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
  // </React.StrictMode>
);

reportWebVitals();
