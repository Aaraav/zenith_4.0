import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

const socket = io('http://localhost:5000'); // Change if needed

export default function Home() {
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

    socket.on('roomJoined', ({ roomId, users }) => {
      console.log(`🎉 Matched and joined room: ${roomId} with users:`, users);
      const hasTwoUsersWithNames = users.filter(u => u.username).length === 2;

      navigate(`/room/${roomId}`);
    });

    return () => {
      socket.off('roomJoined');
    };
  }, [navigate]);

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

    localStorage.setItem('selectedTopic',selectedTopic);

    socket.emit('joinQueue', {
      username: name,
      topic: selectedTopic,
      averageRating,
    });
  };

  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded-2xl shadow-md">
      <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">🎮 Select Topic</h1>

      <div className="mb-4">
        {/* <label htmlFor="topic" className="block text-lg font-semibold mb-2">Choose a Topic:</label> */}
        {/* <select
          id="topic"
          value={selectedTopic}
          onChange={e => setSelectedTopic(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Select a topic</option>
          <option value="ML">ML</option>
          <option value="DSA">DSA</option>
          <option value="System Design">System Design</option>
          <option value="JavaScript">JavaScript</option>
          <option value="Python">Python</option>
          <option value="Java">Java</option>
          <option value="C++">C++</option>
          <option value="Other">Other</option>
        </select> */}
      </div>

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
