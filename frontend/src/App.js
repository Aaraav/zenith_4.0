import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import io from 'socket.io-client';

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
  const [socketId, setSocketId] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const socketConnection = io('http://localhost:5000');  // Replace with your socket server URL
    setSocket(socketConnection);

    // Get the socketId once the socket connects
    socketConnection.on('connect', () => {
      setSocketId(socketConnection.id);
      console.log(`Socket connected with ID: ${socketConnection.id}`);
    });

    // Cleanup the socket connection on component unmount
    return () => {
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, []);

  return (
    <RoomDetailsProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home socketId={socketId} socket={socket} />} />
          <Route
            path="/room/:roomId"
            element={
              <ProtectedRoute>
                <Room socketId={socketId} socket={socket} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile socketId={socketId} socket={socket} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </RoomDetailsProvider>
  );
}
