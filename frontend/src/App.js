import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';

import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Home from './pages/Home';

function Header() {
  return (
    <header style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
      <SignedOut>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}

function AuthRedirect() {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSignedIn) {
      localStorage.clear();
      navigate('/profile');
    }
  }, [isSignedIn, navigate]);

  return null;
}

export default function App() {
  return (
    <>
      <Router>
        <Header />
        <AuthRedirect />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </>
  );
}
