import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { FillSpinner as Loader } from "react-spinners-kit";
import { useNavigate } from "react-router-dom";
function Compiler({ user1, user2, room, questions }) {
  const examples = {
    javascript: `console.log("Hello, World!");\nconst x = 5 + 10;\nx;`,
    python: `print("Hello from Pyodide!")\nfor i in range(3):\n  print("Line", i)`,
    java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}`,
    cpp: `#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello, World!" << endl;\n  return 0;\n}`,
  };
const navigate=useNavigate();
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(examples.javascript);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [output, setOutput] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);

  const pyodideRef = useRef(null);

  // useEffect(() => {
  //   let startTime = localStorage.getItem("questionStartTime");
  //   if (!startTime) {
  //     startTime = Date.now();
  //     localStorage.setItem("questionStartTime", startTime);
  //   }
  
  //   const interval = setInterval(() => {
  //     const now = Date.now();
  //     const diffInSeconds = Math.floor((now - parseInt(startTime)) / 1000);
  //     setElapsedTime(diffInSeconds);
  
  //     if (diffInSeconds >= 1800) { // 30 minutes = 1800 seconds
  //       navigate("/");
  //     }
  //   }, 1000);
  
  //   return () => clearInterval(interval);
  // }, [navigate]);
  

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleEditorDidMount = () => {
    setIsEditorReady(true);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "vs-dark" : "light");
  };

  const toggleLanguage = () => {
    const langs = ["javascript", "python", "java", "cpp"];
    const next = langs[(langs.indexOf(language) + 1) % langs.length];
    setLanguage(next);
    setCode(examples[next]);
    setOutput("");
  };

  const submitCode = async () => {
    try {
      const response = await fetch("http://localhost:4000/evaluate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          room,
          user1,
          user2,
          questions,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error:", errorText);
        return;
      }

      const data = await response.json();
      console.log(data);
      // You can show ratings or something based on `data`
    } catch (error) {
      console.error("Error evaluating code:", error);
    }
  };

  const runCode = async () => {
    if (language === "javascript") {
      const logs = [];
const originalLog = console.log; // ✅ declared outside

try {
  submitCode();

  localStorage.setItem('code', code);
  console.log = (...args) => logs.push(args.join(" "));
  const result = eval(code);
  if (result !== undefined) logs.push(result.toString());
} catch (err) {
  logs.push(`Error: ${err.message}`);
} finally {
  console.log = originalLog; // ✅ always restore it
  setOutput(logs.join("\n"));
}

    } else if (language === "python") {
      if (pyodideRef.current) {
        try {
          const result = await pyodideRef.current.runPythonAsync(code);
          setOutput(result);
          localStorage.setItem("code", code);
          await submitCode();
        } catch (err) {
          setOutput(`Python Error: ${err.message}`);
        }
      } else {
        setOutput("Pyodide is not ready yet.");
      }
    } else {
      setOutput(`${language.toUpperCase()} execution is not supported yet.`);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div className="mb-2 relative w-full">
        <div className="absolute right-[100px] top-2">{formatTime(elapsedTime)}</div>

        <button
          onClick={toggleTheme}
          disabled={!isEditorReady}
          className={`px-4 py-2 rounded-md font-semibold transition-colors ${
            isEditorReady ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-400 cursor-not-allowed text-white"
          }`}
        >
          Toggle Theme
        </button>

        <button
          onClick={runCode}
          disabled={!isEditorReady}
          className={`ml-2 px-4 py-2 rounded-md font-semibold transition-colors ${
            isEditorReady ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-400 cursor-not-allowed text-white"
          }`}
        >
          Run Code
        </button>
      </div>

      <Editor
        height="60vh"
        width="50vw"
        theme={theme}
        language={language === "cpp" ? "cpp" : language}
        loading={<Loader />}
        value={code}
        onChange={(newValue) => setCode(newValue)}
        onMount={handleEditorDidMount}
        options={{ lineNumbers: "on", fontSize: 16 }}
      />

      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          minHeight: "100px",
          backgroundColor: "#f8f8f8",
          whiteSpace: "pre-wrap",
        }}
      >
        <h3 className="font-semibold mb-2">Output:</h3>
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default Compiler;
