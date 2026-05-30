import React, { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@clerk/clerk-react";

const RoomDetailsContext = createContext();

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

export const RoomDetailsProvider = ({ children }) => {
  const { isSignedIn, getToken } = useAuth();
  const [name, setName] = useState("");
  const [topicSelected, setTopicSelected] = useState("");
  const [rating, setRating] = useState(null);
  const [socket, setSocket] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!isSignedIn || !SOCKET_URL) {
      setSocket(null);
      setSocketId(null);
      return undefined;
    }

    let active = true;
    let s = null;

    (async () => {
      const token = await getToken();
      if (!active || !token) return;

      s = io(SOCKET_URL, {
        auth: { token },
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
      s.on("connect", () => active && setSocketId(s.id));
      s.on("disconnect", () => active && setSocketId(null));
      s.on("connect_error", (err) => {
        // eslint-disable-next-line no-console
        console.error("Socket connect error:", err.message);
      });
      if (active) setSocket(s);
    })();

    return () => {
      active = false;
      if (s) s.disconnect();
      setSocket(null);
      setSocketId(null);
    };
  }, [isSignedIn, getToken]);

  return (
    <RoomDetailsContext.Provider
      value={{
        name,
        setName,
        topicSelected,
        setTopicSelected,
        rating,
        setRating,
        socket,
        socketId,
        code,
        setCode,
      }}
    >
      {children}
    </RoomDetailsContext.Provider>
  );
};

export const useRoomDetails = () => useContext(RoomDetailsContext);
