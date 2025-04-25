import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';

import HomeSession from './pages/Room/HomeSession';
import Home from './pages/Home';
import Room from './pages/Room/Room';
import Profile from './pages/Profile';
import { RoomDetailsProvider } from './RoomContext';

function Header() {
  return (
    <header className="p-4 border-b border-gray-300 flex justify-end">
      <SignedOut>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </header>
  );
}

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  return isSignedIn ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <RoomDetailsProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <Room />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </RoomDetailsProvider>
  );
}
