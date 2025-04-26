import React, { useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useRoomDetails } from '../../RoomContext';  // Import the context
import Compiler from '../Compiler';  // Default export

const Room = ({socket,socketId}) => {
//   const { codee } = useRoomDetails();
  const { roomId } = useParams();
  const [code,setcode]=useState("");
  const containerRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user1, setUser1] = useState('guest');
  const [user2, setUser2] = useState('guest');


  useEffect(() => {
    setcode(localStorage.getItem('code'));
    const [u1, u2] = roomId.split('_');
    setUser1(u1);
    setUser2(u2);


    if (socket && socketId) {
      socket.emit('join-room', { roomId, socketId });
    }

    const handleQuestion = (data) => {
      console.log('📩 Received question:', data);
    
      // Update state
      setQuestions((prev) => {
        const updatedQuestions = [...prev, data];
    
        // Save to localStorage
        localStorage.setItem('questions', JSON.stringify(updatedQuestions));
    
        return updatedQuestions;
      });
    
      setLoading(false);
    };
    

    const handleError = (error) => {
      console.error('Error generating question:', error);
      setQuestions((prev) => [
        ...prev,
        { question: '❌ Failed to generate question', timestamp: new Date().toISOString() },
      ]);
      setLoading(false);
    };

    if (socket) {
      socket.on('question-generated', handleQuestion);
      socket.on('questionError', handleError);

      return () => {
        socket.off('question-generated', handleQuestion);
        socket.off('questionError', handleError);
      };
    }
  }, [roomId, socket, socketId]);



useEffect(() => {
  const savedQuestions = localStorage.getItem('questions');
  if (savedQuestions) {
    setQuestions(JSON.parse(savedQuestions));
  }
  setLoading(false);
}, []);
  useEffect(() => {
    // console.log(codee);
    const initCall = async () => {
      const appId = 1031906663;
      const serverSecret = '9c0f1d8070d5b1618e92ab75c0ffe41a';

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appId,
        serverSecret,
        roomId,
        Date.now().toString(),
        'aaraav'
      );

      const zc = ZegoUIKitPrebuilt.create(kitToken);

      zc.joinRoom({
        container: containerRef.current,
        sharedLinks: [
          {
            name: 'Copy Link',
            url: `${window.location.origin}/room/${roomId}`,
          },
        ],
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
      });
    };

    initCall();
  }, [roomId]);

  const generateQuestion = () => {
    console.log('🚀 Generating question for:', { user1, user2, roomId });
    setLoading(true);

    if (socket) {
      socket.emit('generate-question', {
        user1,
        user2,
        room: roomId,
        socketId,
      });
    }
  };

  return (
    <div className="relative w-screen h-screen flex overflow-hidden">
      <div ref={containerRef} className="w-[50vw] h-full" />
        <div className='flex flex-wrap bg-gray-100 w-[50vw] '>
            
        <div className=" w-full h-[50vh] p-6  overflow-y-auto border-black border-solid-[1px]">
            <h2 className="text-xl font-bold mb-4">AI CP/DSA Questions</h2>
            

         

            <ul className="space-y-4">
            {questions.map((q, index) => (
                <li key={index} className="bg-white p-3 rounded shadow">
                <div className="text-sm text-gray-500 mb-1">
                    Question {index + 1} - {new Date(q.timestamp).toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-wrap">{q.question}</div>
                </li>
            ))}
            </ul>
        </div>
        <div className='flex flex-wrap h-[50vh] w-full '><Compiler user1={user1} user2={user2} room={roomId} questions={questions}/></div>
      </div>
    </div>
  );
};

export default Room;
