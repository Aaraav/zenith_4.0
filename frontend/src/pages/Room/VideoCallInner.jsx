import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useRTCClient,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  usePublish,
  useJoin,
  useRemoteUsers,
  RemoteUser,
  LocalVideoTrack,
} from "agora-rtc-react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  PhoneOff,
  Send,
  User,
  X,
} from "lucide-react";

const APP_ID = process.env.REACT_APP_AGORA_APP_ID;

// ─── Chat Panel (controlled — messages live in the parent) ──────────────────
function ChatPanel({ messages, onSend, currentUser, onClose }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-black/90 backdrop-blur-xl border-l border-white/10 shadow-2xl">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-[color:var(--color-primary)]" />
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
            Live Chat
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20">
            <MessageSquare size={32} className="mb-2" />
            <p className="text-xs">No messages yet</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMine = m.from === currentUser;
          return (
            <div key={i} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <span className="text-[9px] text-white/30 mb-1 px-1">
                {isMine ? "You" : m.from}
              </span>
              <div
                className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] break-words ${
                  isMine
                    ? "bg-[color:var(--color-primary)] text-white rounded-tr-none"
                    : "bg-white/10 text-white/90 rounded-tl-none border border-white/5"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-black/40 border-t border-white/10">
        <div className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[color:var(--color-primary)]/50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-2 p-1.5 text-[color:var(--color-primary)] disabled:text-white/10 transition-colors"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Video Logic ───────────────────────────────────────────────────────
export default function VideoCallInner({
  channelName,
  token,
  uid,
  onLeave,
  socket,
  currentUser,
  roomId,
}) {
  const client = useRTCClient();
  const [micOn, setMicOn]         = useState(true);
  const [camOn, setCamOn]         = useState(true);
  const [chatOpen, setChatOpen]   = useState(false);
  const [messages, setMessages]   = useState([]);
  const [unread, setUnread]       = useState(0);

  const { localMicrophoneTrack } = useLocalMicrophoneTrack();
  const { localCameraTrack }     = useLocalCameraTrack();


  useJoin({ appid: APP_ID, channel: channelName, token, uid }, !!token);
  usePublish([localMicrophoneTrack, localCameraTrack]);

  useEffect(() => { localMicrophoneTrack?.setEnabled(micOn); }, [micOn, localMicrophoneTrack]);
  useEffect(() => { localCameraTrack?.setEnabled(camOn); },     [camOn, localCameraTrack]);

  // Receive incoming chat messages — bump unread counter when chat is closed.
  // chatOpen tracked via ref so we don't have to re-bind the listener on toggle.
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!chatOpenRef.current) setUnread((c) => c + 1);
    };
    socket.on("chat-message", handler);
    return () => socket.off("chat-message", handler);
  }, [socket]);

  // Reset unread the moment chat is opened.
  useEffect(() => { if (chatOpen) setUnread(0); }, [chatOpen]);

  const sendMessage = useCallback((text) => {
    if (!socket) return;
    const msg = { from: currentUser, text, ts: Date.now() };
    socket.emit("chat-message", { roomId, ...msg });
    setMessages((prev) => [...prev, msg]);
  }, [socket, roomId, currentUser]);

  const remoteUsers = useRemoteUsers();
  const remoteUser  = remoteUsers[0] ?? null;

  const handleLeave = useCallback(async () => {
    localMicrophoneTrack?.close();
    localCameraTrack?.close();
    await client.leave();
    onLeave();
  }, [client, localMicrophoneTrack, localCameraTrack, onLeave]);

  return (
    <div className="relative w-full h-full bg-[#050505] overflow-hidden flex flex-col">
      <div className="relative flex-1 min-h-0 overflow-hidden group">
      {/* Remote video Tab */}
      <div className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${chatOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        {remoteUser ? (
          <RemoteUser
            user={remoteUser}
            playVideo
            playAudio
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center bg-white/5 animate-pulse">
              <User size={32} className="text-white/20" />
            </div>
            <p className="text-xs font-medium text-white/30 tracking-widest uppercase">
              Waiting for opponent...
            </p>
          </div>
        )}
      </div>

      {/* Local PiP — only visible in video tab */}
      <div
        className={`absolute bottom-4 right-4 w-36 h-28 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-gray-900 z-10 transition-all duration-300 ease-in-out ${
          chatOpen ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
        }`}
      >
        <LocalVideoTrack
          track={localCameraTrack}
          play={camOn}
          style={{ width: "100%", height: "100%", display: camOn ? "block" : "none" }}
        />
        {!camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white/20">
            <VideoOff size={24} />
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white/70 backdrop-blur-md">
          You
        </div>
      </div>

      {/* Chat Tab — covers full section */}
      <div
        className={`absolute inset-0 z-40 transition-all duration-300 ${
          chatOpen 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <ChatPanel
          messages={messages}
          onSend={sendMessage}
          currentUser={currentUser}
          onClose={() => setChatOpen(false)}
        />
      </div>
      </div>

      {/* Control bar — footer below video/chat so input is never covered */}
      <div className="flex shrink-0 items-center justify-center gap-3 px-6 py-3 bg-black/40 backdrop-blur-xl border-t border-white/10">
        <IconBtn
          active={micOn}
          onClick={() => setMicOn((v) => !v)}
          Icon={micOn ? Mic : MicOff}
          label={micOn ? "Mute" : "Unmute"}
        />
        <IconBtn
          active={camOn}
          onClick={() => setCamOn((v) => !v)}
          Icon={camOn ? Video : VideoOff}
          label={camOn ? "Stop video" : "Start video"}
        />
        <div className="w-px h-6 bg-white/10 mx-1" />
        <IconBtn
          active={chatOpen}
          onClick={() => setChatOpen((v) => !v)}
          Icon={MessageSquare}
          label="Chat"
          highlight={chatOpen}
          badge={unread}
        />
        <button
          onClick={handleLeave}
          className="ml-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
          aria-label="Leave call"
        >
          <PhoneOff size={18} />
        </button>
      </div>
    </div>


  );
}

function IconBtn({ active, onClick, Icon, label, highlight, badge }) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2.5 rounded-xl transition-all border ${
        highlight
          ? "bg-[color:var(--color-primary)] border-[color:var(--color-primary)] text-white shadow-lg shadow-[color:var(--color-primary)]/20"
          : active
          ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
      }`}
      aria-label={label}
    >
      <Icon size={18} />
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-black/40 animate-pulse">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
