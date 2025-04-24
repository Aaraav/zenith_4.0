import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react'
import reportWebVitals from './reportWebVitals';
const VITE_CLERK_PUBLISHABLE_KEY = "pk_test_bGliZXJhbC1tYWNhcXVlLTM0LmNsZXJrLmFjY291bnRzLmRldiQ";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
  <ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
    <App />
  </ClerkProvider>
</React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
