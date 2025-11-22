import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const useSocket = (url) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Create socket connection when the component mounts
    const socketIo = io(
      "https://zenith-4-0.onrender.com"  
    
    );

    // Store the socket instance in the state
    setSocket(socketIo);

    // Cleanup the socket connection when the component unmounts
    return () => {
      socketIo.disconnect();
    };
  }, [url]); // Effect runs when the URL changes (if applicable)

  return socket;
};

export default useSocket;
