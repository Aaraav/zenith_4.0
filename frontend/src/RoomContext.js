import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';  

const RoomDetailsContext = createContext();

export const RoomDetailsProvider = ({ children }) => {
  const [name, setName] = useState('');
  const [topicSelected, setTopicSelected] = useState('');
  const [rating, setRating] = useState(null);
  const [socket, setSocket] = useState(null);  
  const [socketId, setSocketId] = useState(null);  
const [codee,setcodee]=useState("");
  useEffect(() => {
    const socketConnection = io('http://localhost:5000');  

    socketConnection.on('connect', () => {
      setSocketId(socketConnection.id);  
    });

    setSocket(socketConnection);

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
