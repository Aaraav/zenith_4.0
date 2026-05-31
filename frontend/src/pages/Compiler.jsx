import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { CompilerButton } from "../components/ui/compiler-button";
import MatchAnalysisModal from "../components/MatchAnalysisModal";
import { useRoomDetails } from "../RoomContext";
import { api } from "../lib/api";
import { Play, CheckCircle, X } from "lucide-react";

function normalizeTestOutput(value) {
  let s = String(value ?? "").trim();
  if (
    s.length >= 2
    && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

function outputsMatch(actual, expected) {
  return normalizeTestOutput(actual) === normalizeTestOutput(expected);
}

function codeStorageKey(room, username, language) {
  if (!room || !username) return null;
  return `roomCode_${room}_${username}_${language}`;
}

function langStorageKey(room, username) {
  if (!room || !username) return null;
  return `roomLang_${room}_${username}`;
}

function isDefaultRoomCode(code) {
  return /^\/\/\s*.+'s code\s*$/.test(String(code ?? "").trim());
}

function Compiler({ user1, user2, room, questions }) {
  const myUsername = user1;
  const { socket } = useRoomDetails();

  const [myCode, setMyCode] = useState(`// Solve the challenge here...`);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [language, setLanguage] = useState(() => {
    const key = langStorageKey(room, user1);
    return (key && localStorage.getItem(key)) || "javascript";
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [output, setOutput] = useState(null);
  const [opponentCode, setOpponentCode] = useState("// Opponent's code will appear here...");
  const [opponentProgress, setOpponentProgress] = useState("");
  const [tabSwitches, setTabSwitches] = useState(0);

  // Security: Track tab switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !hasSubmitted) {
        setTabSwitches((prev) => prev + 1);
        setOutput({ 
          type: "error", 
          content: "Security Alert: Tab switching detected! This incident has been recorded and may affect your final evaluation." 
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [hasSubmitted]);

  // Restore saved code or starter when language/question loads (skip if already submitted)
  useEffect(() => {
    if (hasSubmitted) return;
    const storageKey = codeStorageKey(room, myUsername, language);
    const saved = storageKey ? localStorage.getItem(storageKey) : null;
    if (saved) {
      setMyCode(saved);
      return;
    }
    const starter = questions?.[0]?.questionData?.starterCode?.[language];
    if (starter) setMyCode(starter);
  }, [language, questions, hasSubmitted, room, myUsername]);

  useEffect(() => {
    const key = langStorageKey(room, myUsername);
    if (key) localStorage.setItem(key, language);
  }, [language, room, myUsername]);

  useEffect(() => {
    if (!socket || !myUsername) return;

    const handleEvaluationComplete = (results) => {
      setStatus("Completed");
      setEvaluationResult(results);
      for (const lang of ["javascript", "python", "cpp", "java"]) {
        const key = codeStorageKey(room, myUsername, lang);
        if (key) localStorage.removeItem(key);
      }
    };

    const handleRoomState = ({
      myCode: serverCode,
      opponentCode: oppCode,
      hasSubmitted: submitted,
      opponentHasSubmitted,
    }) => {
      if (serverCode?.trim() && !submitted && !isDefaultRoomCode(serverCode)) {
        setMyCode(serverCode);
        const storageKey = codeStorageKey(room, myUsername, language);
        if (storageKey) localStorage.setItem(storageKey, serverCode);
      }
      if (oppCode?.trim()) setOpponentCode(oppCode);
      if (submitted) {
        setHasSubmitted(true);
        setStatus(
          opponentHasSubmitted
            ? "Both users have submitted. Evaluating..."
            : "Spectating Opponent...",
        );
      }
    };

    socket.on("roomState", handleRoomState);

    socket.on("statusUpdate", ({ message }) => setStatus(message));
    socket.on("evaluationComplete", handleEvaluationComplete);
    socket.on("testProgress", ({ username, passed, total }) => {
      if (username === myUsername) {
        setStatus(`Running Tests: ${passed}/${total} Passed`);
      } else {
        setOpponentProgress(`Opponent Tests: ${passed}/${total}`);
      }
    });
    socket.on("submissionResult", ({ success, message }) => {
      setIsSubmitting(false);
      if (success) {
        setHasSubmitted(true);
        setStatus("Spectating Opponent...");
        setOutput({ type: "success", content: "All hidden tests passed! Code submitted." });
      } else {
        setStatus("Submission Failed");
        setOutput({ type: "error", content: `Hidden test failed:\n${message}` });
      }
    });
    socket.on("serverError", ({ event, message }) => {
      if (event === "submitCode") {
        setIsSubmitting(false);
        setStatus("Submission Failed");
        setOutput({ type: "error", content: message || "Submission failed due to a server error." });
      }
    });
    socket.on("opponentCodeChange", ({ code }) => {
      setOpponentCode(code);
    });

    return () => {
      socket.off("roomState", handleRoomState);
      socket.off("statusUpdate");
      socket.off("evaluationComplete");
      socket.off("testProgress");
      socket.off("submissionResult");
      socket.off("serverError");
      socket.off("opponentCodeChange");
    };
  }, [socket, myUsername, room, language]);

  const handleEditorChange = (value) => {
    const code = value || "";
    setMyCode(code);
    const storageKey = codeStorageKey(room, myUsername, language);
    if (storageKey) localStorage.setItem(storageKey, code);
    socket?.emit("codeChange", { roomId: room, code: value });
  };

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);

    const questionData = questions?.[0]?.questionData;
    const entryPoint = questionData?.entryPoint || null;
    const visibleTests = questionData?.visibleTestCases || [];
    
    if (visibleTests.length === 0) {
      setOutput({ type: "info", content: "No visible test cases found. Running without input..." });
      try {
        const res = await api.post("/api/compiler/run", { language, code: myCode, input: "", entryPoint });
        if (res.data.success) {
          setOutput({ type: res.data.result.stderr ? "error" : "success", content: res.data.result.stderr || res.data.result.stdout || "Code executed successfully." });
        } else {
          setOutput({ type: "error", content: res.data.message });
        }
      } catch (err) {
        setOutput({ type: "error", content: err.response?.data?.message || "Execution failed." });
      }
      setIsRunning(false);
      return;
    }

    setOutput({ type: "info", content: `Running ${visibleTests.length} test cases...` });
    
    let passedCount = 0;
    let details = "";

    for (let i = 0; i < visibleTests.length; i++) {
      const tc = visibleTests[i];
      try {
        const res = await api.post("/api/compiler/run", { language, code: myCode, input: tc.input, entryPoint });
        if (res.data.success) {
          const out = (res.data.result.stdout || res.data.result.output || "").trim();
          const expected = (tc.output || "").trim();
          const err = res.data.result.stderr || res.data.result.error || "";
          if (err) {
            details += `Test ${i + 1} Error:\n${err}\n\n`;
          } else if (outputsMatch(out, expected)) {
            passedCount++;
            details += `Test ${i + 1} Passed.\n`;
          } else {
            details += `Test ${i + 1} Failed.\nInput: ${tc.input}\nExpected: ${expected}\nGot: ${out}\n\n`;
          }
        } else {
           details += `Test ${i + 1} Failed to execute: ${res.data.message}\n\n`;
        }
      } catch (err) {
        details += `Test ${i + 1} Execution error: ${err.response?.data?.message || err.message}\n\n`;
      }
    }

    const allPassed = passedCount === visibleTests.length;
    setOutput({
      type: allPassed ? "success" : "error",
      content: `${passedCount}/${visibleTests.length} Test Cases Passed\n\n${details}`
    });
    
    setIsRunning(false);
  };

  const handleCodeSubmit = () => {
    if (hasSubmitted || isSubmitting || !isEditorReady || !socket) return;
    if (!socket.connected) {
      setStatus("Disconnected");
      setOutput({
        type: "error",
        content: "Lost connection to the server. Wait a moment for reconnect, then try Submit again.",
      });
      return;
    }
    setIsSubmitting(true);
    setStatus("Submitting & Running Tests...");
    socket.emit("submitCode", {
      roomId: room,
      language,
      tabSwitches,
      code: myCode,
      questionData: questions?.[0]?.questionData,
    });
  };

  const questionData = questions?.[0]?.questionData;
  const entryPoint = questionData?.entryPoint;
  const functionSignature = entryPoint
    ? `${entryPoint.returnType} ${entryPoint.name}(${entryPoint.parameters.map((p) => `${p.type} ${p.name}`).join(", ")})`
    : null;

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={hasSubmitted}
            className="bg-white/5 text-white/70 text-xs px-2 py-1 rounded border border-white/10 focus:outline-none focus:border-[color:var(--color-primary)] transition-all hover:bg-white/10 disabled:opacity-50"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${hasSubmitted ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`}
            />
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">
              {status}
            </span>
          </div>
          {opponentProgress && (
            <div className="flex items-center gap-2 ml-4 px-2 py-1 bg-red-500/10 rounded border border-red-500/20">
               <span className="text-[10px] uppercase font-bold text-red-400 tracking-widest">
                {opponentProgress}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!hasSubmitted && (
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="h-8 px-4 text-xs font-bold bg-white/5 hover:bg-white/10 text-white/70 rounded-lg border border-white/10 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isRunning ? (
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Play size={12} />
              )}
              Run
            </button>
          )}

          <CompilerButton
            onClick={handleCodeSubmit}
            disabled={hasSubmitted || isRunning || isSubmitting}
            className={`h-8 px-4 text-xs font-bold transition-all ${
              hasSubmitted
                ? "bg-white/10 text-white/40"
                : "bg-[color:var(--color-primary)] hover:brightness-110 text-white shadow-lg shadow-[color:var(--color-primary)]/20"
            }`}
          >
            {hasSubmitted ? (
              <CheckCircle size={14} className="mr-2" />
            ) : (
              <CheckCircle size={14} className="mr-2" />
            )}
            {hasSubmitted ? "Submitted" : "Submit"}
          </CompilerButton>
        </div>
      </div>

      {functionSignature && !hasSubmitted && (
        <div className="px-4 py-1.5 bg-black/30 border-b border-white/5 font-mono text-xs text-[color:var(--color-primary)]/90">
          {functionSignature}
        </div>
      )}

      {/* Monaco Instance */}
      <div 
        className="flex-1 overflow-hidden relative"
        onPaste={(e) => {
          if (!hasSubmitted) {
            e.preventDefault();
            setOutput({ type: "error", content: "Security Alert: Pasting code is not allowed during a match!" });
          }
        }}
      >
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          value={hasSubmitted ? opponentCode : myCode}
          onChange={handleEditorChange}
          onMount={() => setIsEditorReady(true)}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            padding: { top: 20 },
            fontFamily: "Fira Code, monospace",
            cursorSmoothCaretAnimation: "on",
            readOnly: hasSubmitted,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible'
            }
          }}
        />

        {/* Output Panel Overlay */}
        {output && (
          <div className="absolute bottom-0 left-0 right-0 max-h-[40%] bg-black/95 backdrop-blur-xl border-t border-white/10 z-20 flex flex-col">
            <div className="flex items-center justify-between px-4 py-1.5 bg-white/5 border-b border-white/5">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">
                Output
              </span>
              <button 
                onClick={() => setOutput(null)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
              <pre className={`whitespace-pre-wrap ${
                output.type === "error" ? "text-red-400" : 
                output.type === "success" ? "text-green-400" : "text-white/80"
              }`}>
                {output.content}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Match Analysis Modal */}
      {evaluationResult && <MatchAnalysisModal result={evaluationResult} />}
    </div>
  );
}

export default Compiler;
