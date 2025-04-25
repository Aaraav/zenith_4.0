import React, { createContext, useContext, useState } from 'react';

const RoomDetailsContext = createContext();

export const RoomDetailsProvider = ({ children }) => {
  const [name, setname] = useState('');
  const [topicSelected, setTopicSelected] = useState('');
  const [rating, setRating] = useState(null);

  return (
    <RoomDetailsContext.Provider value={{ name, setname, topicSelected, setTopicSelected, rating, setRating }}>
      {children}
    </RoomDetailsContext.Provider>
  );
};

export const useRoomDetails = () => useContext(RoomDetailsContext);
