import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useNavigate } from "react-router-dom"; // Import for navigation

// This component now requires the main socket instance and the current user's username
function Compiler({ socket, user1, user2, room, questions }) {
    // The parent 'Room' component now guarantees that 'user1' is the current user.
    const myUsername = user1;
    const navigate = useNavigate(); // Hook for navigation

    const [myCode, setMyCode] = useState(`// Your code for: ${myUsername}`);
    const [isEditorReady, setIsEditorReady] = useState(false);
    const [status, setStatus] = useState("Connecting...");
    const [evaluationResult, setEvaluationResult] = useState(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const hasJoinedRoom = useRef(false);

    useEffect(() => {
        // This effect handles the reload behavior.
        const handleBeforeUnload = () => {
            // If the results are showing, set a flag in sessionStorage before reload.
            if (evaluationResult) {
                sessionStorage.setItem('redirectOnLoad', 'true');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // On component load, check for the flag.
        if (sessionStorage.getItem('redirectOnLoad') === 'true') {
            sessionStorage.removeItem('redirectOnLoad'); // Clear the flag
            navigate('/'); // Redirect to home
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [evaluationResult, navigate]);

    useEffect(() => {
        if (!socket || typeof socket.emit !== 'function' || !myUsername) {
            return;
        }

        // --- JOIN ROOM LOGIC ---
        if (!hasJoinedRoom.current) {
            socket.emit("joinRoom", { roomId: room, username: myUsername });
            hasJoinedRoom.current = true;
            setStatus("Ready to code!");
        }

        // --- GAME EVENT LISTENERS ---
        const handleStatusUpdate = ({ message }) => setStatus(message);
        const handleOpponentSubmitted = ({ username }) => setStatus(`User ${username} has submitted!`);
        
        const handleEvaluationComplete = (results) => {
            console.log("SUCCESS: 'evaluationComplete' event received by client.", results);
            setStatus("Evaluation Complete!");
            setEvaluationResult(results);
        };
        const handleEvaluationError = ({ message }) => {
            console.error("ERROR: 'evaluationError' event received by client.", message);
            setStatus(message);
            setEvaluationResult(null);
        };
        const handleOpponentDisconnect = ({ message }) => {
            setStatus(message);
            setEvaluationResult(null);
            setHasSubmitted(true); // Disable submission
        };

        socket.on("statusUpdate", handleStatusUpdate);
        socket.on("opponentSubmitted", handleOpponentSubmitted);
        socket.on("evaluationComplete", handleEvaluationComplete);
        socket.on("evaluationError", handleEvaluationError);
        socket.on("opponentDisconnected", handleOpponentDisconnect);

        return () => {
            // Cleanup all listeners
            socket.off("statusUpdate", handleStatusUpdate);
            socket.off("opponentSubmitted", handleOpponentSubmitted);
            socket.off("evaluationComplete", handleEvaluationComplete);
            socket.off("evaluationError", handleEvaluationError);
            socket.off("opponentDisconnected", handleOpponentDisconnect);
        };
    }, [socket, room, myUsername]);

    const handleEditorChange = (value) => {
        const newCode = value || "";
        setMyCode(newCode);
        if (socket && typeof socket.emit === 'function') {
            socket.emit("codeChange", { roomId: room, username: myUsername, code: newCode });
        }
    };

    const handleCodeSubmit = () => {
        if (hasSubmitted || !isEditorReady || !socket || typeof socket.emit !== 'function') return;
        setHasSubmitted(true);
        setStatus("You have submitted. Waiting for opponent...");
        socket.emit("submitCode", { roomId: room, username: myUsername });
    };

    const handleBackToHome = () => {
        navigate('/'); // Navigate to the home page
    };

    return (
        <div className="p-4 w-full h-full flex flex-col bg-gray-900 text-white relative">
            
            {/* --- CODING VIEW --- */}
            <div className="mb-4 flex justify-between items-center">
                <button
                    onClick={handleCodeSubmit}
                    disabled={!socket || !isEditorReady || hasSubmitted || evaluationResult}
                    className="px-4 py-2 rounded-md font-semibold bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    {hasSubmitted ? "Submitted" : "Submit Your Code"}
                </button>
                <div className="font-mono text-lg text-yellow-400">{status}</div>
            </div>

            <div className="flex-grow">
                <h3 className="font-semibold mb-2">Your Editor ({myUsername})</h3>
                <Editor
                    height="50vh"
                    theme="vs-dark"
                    language="javascript"
                    value={myCode}
                    onChange={handleEditorChange}
                    onMount={() => setIsEditorReady(true)}
                    options={{ fontSize: 14, minimap: { enabled: false } }}
                />
            </div>

            {/* --- RESULTS MODAL OVERLAY --- */}
            {evaluationResult && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center p-4 z-50">
                    <div className="w-full max-w-4xl p-6 border-2 border-green-500 rounded-md bg-gray-800 shadow-lg">
                        <h3 className="font-bold text-3xl mb-4 text-center text-white">Final Results</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="font-semibold text-xl text-white">{evaluationResult?.user1?.username}'s Rating: {evaluationResult?.user1?.newRating} <span className="text-green-400 font-bold">(+{evaluationResult?.user1?.increment})</span></p>
                                <p className="text-md mt-2 whitespace-pre-wrap text-gray-300">{evaluationResult?.user1?.analysis}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-xl text-white">{evaluationResult?.user2?.username}'s Rating: {evaluationResult?.user2?.newRating} <span className="text-green-400 font-bold">(+{evaluationResult?.user2?.increment})</span></p>
                                <p className="text-md mt-2 whitespace-pre-wrap text-gray-300">{evaluationResult?.user2?.analysis}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleBackToHome}
                        className="mt-8 px-8 py-3 rounded-md font-semibold bg-blue-600 hover:bg-blue-700 text-white text-lg"
                    >
                        Back to Home
                    </button>
                </div>
            )}
        </div>
    );
}

export default Compiler;
