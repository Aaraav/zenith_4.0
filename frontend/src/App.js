import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

import Home from "./pages/Home";
import Room from "./pages/Room/Room";
import Profile from "./pages/Profile";
import BattleHistory from "./pages/BattleHistory";
import { RoomDetailsProvider } from "./RoomContext";
import Navbar from "./pages/Navbar";

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return null;
  return isSignedIn ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn === false) {
      localStorage.clear();
      if (!sessionStorage.getItem("reloadedOnLogout")) {
        sessionStorage.setItem("reloadedOnLogout", "true");
        window.location.reload();
      } else {
        sessionStorage.removeItem("reloadedOnLogout");
      }
    }
  }, [isSignedIn]);

  return (
    <RoomDetailsProvider>
      <Router>
        <Navbar />
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
            path="/battle-history"
            element={
              <ProtectedRoute>
                <BattleHistory />
              </ProtectedRoute>
            }
          />
          <Route path="/profile/:username" element={<Profile />} />
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
