import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';  // Import socket.io-client

const RoomDetailsContext = createContext();

export const RoomDetailsProvider = ({ children }) => {
  const [name, setName] = useState('');
  const [topicSelected, setTopicSelected] = useState('');
  const [rating, setRating] = useState(null);
  const [socket, setSocket] = useState(null);  // To store socket instance
  const [socketId, setSocketId] = useState(null);  // To store socket ID
const [codee,setcodee]=useState("");
  useEffect(() => {
    const socketConnection = io('https://zenith-4-0.onrender.com');  // Update with your server URL

    socketConnection.on('connect', () => {
      setSocketId(socketConnection.id);  // Set the socket ID when connected
    });

    setSocket(socketConnection);

    // Cleanup socket connection on component unmount
    return () => {
      socketConnection.disconnect();
    };
  }, []);

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
        codee,
        setcodee
      }}
    >
      {children}
    </RoomDetailsContext.Provider>
  );
};

export const useRoomDetails = () => useContext(RoomDetailsContext);
