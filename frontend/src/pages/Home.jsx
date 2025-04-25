import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home({ socketId, socket }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('DSA');
  const [ratings, setRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [roomId, setRoomId] = useState(null);
  const [matchedMsg, setMatchedMsg] = useState('');

  useEffect(() => {
    // Fetch user details from localStorage
    const userDetails = localStorage.getItem('userdetails');
    if (userDetails) {
      const parsed = JSON.parse(userDetails);
      const username = parsed.username?.trim();
      setName(username && username.length > 0 ? username : 'Guest');
      setRatings(parsed.ratings || []);
    } else {
      setName('Guest');
    }

    // Listen for roomJoined event from the server
    if (socket) {
      socket.on('roomJoined', ({ roomId, users }) => {
        console.log(`🎉 Matched and joined room: ${roomId} with users:`, users);
        const hasTwoUsersWithNames = users.filter(u => u.username).length === 2;
        localStorage.setItem('socketId', socket.id); // Store socketId for future use
        setRoomId(roomId); // Store roomId to conditionally show matched message
        setMatchedMsg(`🎉 You have been matched with a user! Room ID: ${roomId}`);
        navigate(`/room/${roomId}`);
      });
    }

    // Cleanup the socket listener when component unmounts
    return () => {
      if (socket) {
        socket.off('roomJoined');
      }
    };
  }, [socket, navigate]); // Dependency on socket to re-run when socket is initialized

  useEffect(() => {
    if (ratings.length > 0) {
      const totalRating = ratings.reduce((sum, rating) => sum + rating, 0);
      setAverageRating(totalRating / ratings.length);
    } else {
      setAverageRating(0);
    }
  }, [ratings]);

  const handleSendData = () => {
    if (!name || !selectedTopic || averageRating === undefined) {
      console.error('⚠️ Invalid data');
      return;
    }

    localStorage.setItem('selectedTopic', selectedTopic);

    if (socket) {
      socket.emit('joinQueue', {
        username: name,
        topic: selectedTopic,
        averageRating,
        socketId, // Pass the socketId when emitting data
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-2xl shadow-md">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">🎮 Select Topic</h1>

      <div className="text-center mt-10 text-xl font-bold">
        Hello, {name || 'Guest'}!
      </div>

      {matchedMsg && (
        <div className="text-green-600 text-center mt-6 font-semibold">{matchedMsg}</div>
      )}

      {!roomId && (
        <div className="mt-6 text-center">
          <button
            onClick={handleSendData}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
          >
            Join Matchmaking Queue
          </button>
        </div>
      )}
    </div>
  );
}
