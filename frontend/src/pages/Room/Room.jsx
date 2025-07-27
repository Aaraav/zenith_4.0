import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import Compiler from '../Compiler'; // Your updated Compiler component

const Room = ({ socket }) => {
  const { roomId } = useParams();
  const containerRef = useRef(null);
  const [questions, setQuestions] = useState([]);
  
  // State to hold the identity of the currently logged-in user.
  const [currentUser, setCurrentUser] = useState(null);
  // State to hold the correctly ordered users for the Compiler props.
  const [compilerUsers, setCompilerUsers] = useState(null);

  useEffect(() => {
    // This effect runs once to determine the current user's identity from localStorage.
    let loggedInUser = null;
    const userDetailsString = localStorage.getItem('userdetails');
    if (userDetailsString) {
        try {
            const userDetails = JSON.parse(userDetailsString);
            loggedInUser = userDetails.username?.trim();
        } catch (error) {
            console.error("Error parsing 'userdetails' from localStorage:", error);
        }
    }

    if (loggedInUser) {
      
        setCurrentUser(loggedInUser);
    } else {
        console.error("CRITICAL: Could not find 'username' in localStorage. The application may not work correctly.");
        // Fallback for safety, though this is not ideal.
        const [u1] = roomId.split('_');
        setCurrentUser(u1);
    }
  }, [roomId]);

  useEffect(() => {
    // This effect runs after the currentUser is identified. It prepares the props
    // for the Compiler component, ensuring 'user1' is always the current user.
    if (currentUser) {
        const urlUsers = roomId.split('_');
        const u1 = urlUsers[0];
        const u2 = urlUsers[1];

        if (currentUser === u1) {
            setCompilerUsers({ user1: u1, user2: u2 });
        } else {
            // If I am user2, swap the props so that the Compiler receives me as 'user1'.
            setCompilerUsers({ user1: u2, user2: u1 });
        }
    }
  }, [currentUser, roomId]);

  useEffect(() => {
    // This effect now handles all socket events and the Zego call initialization.
    // It will only run when the socket is ready and the compilerUsers are identified.
    if (!socket || !compilerUsers) return;

    // Your console.log is now here, where it will have the correct value.
    console.log("Compiler users are now set:", compilerUsers);

    const handleQuestion = (data) => {
      console.log('📩 Received question:', data);
      setQuestions([data]); 
      localStorage.setItem(`latestQuestion_${roomId}`, JSON.stringify([data]));
    };
    
    const handleError = (error) => {
      console.error('Error generating question:', error);
      const errorQuestion = { question: '❌ Failed to generate question', timestamp: new Date().toISOString() };
      setQuestions([errorQuestion]);
    };

    socket.on('question-generated', handleQuestion);
    socket.on('questionError', handleError);

    // Initialize the Zego video call
    const initCall = async () => {
      if (!containerRef.current || !ZegoUIKitPrebuilt) return;
      const appId = 1383669195;
      const serverSecret = '7543664457db804ada784b12440dea98';
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appId,
        serverSecret,
        roomId,
        Date.now().toString(),
        currentUser
      );
      const zc = ZegoUIKitPrebuilt.create(kitToken);
      zc.joinRoom({
        container: containerRef.current,
        sharedLinks: [{ name: 'Copy Link', url: `${window.location.origin}/room/${roomId}` }],
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
        showScreenSharingButton: false, 
      });
    };
    initCall();

    return () => {
      socket.off('question-generated', handleQuestion);
      socket.off('questionError', handleError);
    };
  }, [roomId, socket, currentUser, compilerUsers]); // This effect now depends on compilerUsers

  useEffect(() => {
    // This effect loads the latest question from storage on initial render.
    const savedQuestion = localStorage.getItem(`latestQuestion_${roomId}`);
    if (savedQuestion) {
        try {
            const parsed = JSON.parse(savedQuestion);
            if (Array.isArray(parsed)) {
                setQuestions(parsed);
            }
        } catch (e) {
            console.error("Failed to parse questions from localStorage", e);
        }
    }
  }, [roomId]);

  return (
    <div className="relative w-screen h-screen flex overflow-hidden">
      <div ref={containerRef} className="w-[50vw] h-full" />
        <div className='flex flex-wrap bg-gray-100 w-[50vw] '>
            
        <div className=" w-full h-[50vh] p-6  overflow-y-auto border-black border-solid-[1px]">
            <h2 className="text-xl font-bold mb-4">AI CP/DSA Questions</h2>
            
            <ul className="space-y-4">
              {questions.length > 0 && (
                (() => {
                  const lastQuestion = questions[questions.length - 1];
                  return (
                    <li className="bg-white p-3 rounded shadow">
                      <div className="text-sm text-gray-500 mb-1">
                        Latest Question - {new Date(lastQuestion.timestamp).toLocaleTimeString()}
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: lastQuestion.question }} />
                    </li>
                  );
                })()
              )}
            </ul>
        </div>
        
        <div className='flex flex-wrap h-[50vh] w-full '>
            {/* Render the compiler only after the user order has been determined */}
            {compilerUsers ? (
                <Compiler 
                    socket={socket} 
                    user1={compilerUsers.user1} // This is now guaranteed to be the current user
                    user2={compilerUsers.user2} // This is now guaranteed to be the opponent
                    room={roomId} 
                    questions={questions}
                />
            ) : (
                <div className="p-4 text-center w-full">Initializing compiler...</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Room;
