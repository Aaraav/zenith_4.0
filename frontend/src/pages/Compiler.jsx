import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { FillSpinner as Loader } from "react-spinners-kit";

function Compiler() {
  const examples = {
    javascript: `console.log("Hello, World!");\nconst x = 5 + 10;\nx;`,
    python: `print("Hello from Pyodide!")\nfor i in range(3):\n  print("Line", i)`,
    java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}`,
    cpp: `#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello, World!" << endl;\n  return 0;\n}`,
  };

  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(examples.javascript);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [output, setOutput] = useState("");

  const editorRef = useRef(null);
  const pyodideRef = useRef(null);

  // Load Pyodide script
//   useEffect(() => {
//     const loadPyodide = async () => {
//       try {
//         const script = document.createElement("script");
//         script.src = "https://cdn.jsdelivr.net/npm/pyodide@0.22.1/full/pyodide.js";
//         script.onload = async () => {
//           pyodideRef.current = await loadPyodide();
//           setOutput("Pyodide is ready.");
//         };
//         document.body.appendChild(script);
//       } catch (error) {
//         console.error("Error loading Pyodide:", error);
//         setOutput("Error loading Pyodide.");
//       }
//     };

//     if (language === "python") {
//       loadPyodide();
//     }
//   }, [language]);

  // Editor setup
  function handleEditorDidMount() {
    setIsEditorReady(true);
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "vs-dark" : "light");
  }

  function toggleLanguage() {
    const langs = ["javascript", "python", "java", "cpp"];
    const next = langs[(langs.indexOf(language) + 1) % langs.length];
    setLanguage(next);
    setCode(examples[next]);
    setOutput("");
  }

  async function runCode() {
    if (language === "javascript") {
      try {
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(" "));
        const result = eval(code);
        if (result !== undefined) logs.push(result.toString());
        console.log = originalLog;
        setOutput(logs.join("\n"));
      } catch (err) {
        setOutput(`Error: ${err.message}`);
      }
    } else if (language === "python") {
      if (pyodideRef.current) {
        try {
          const result = await pyodideRef.current.runPythonAsync(code);
          setOutput(result);
        } catch (err) {
          setOutput(`Python Error: ${err.message}`);
        }
      } else {
        setOutput("Pyodide is not ready yet.");
      }
    } else if (language === "java") {
      setOutput("Java execution is not supported yet.");
    } else if (language === "cpp") {
      setOutput("C++ execution is not supported yet.");
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={toggleTheme} disabled={!isEditorReady}>
          Toggle Theme
        </button>
        <button
          onClick={toggleLanguage}
          disabled={!isEditorReady}
          style={{ marginLeft: "10px" }}
        >
          Change Language ({language})
        </button>
        <button
          onClick={runCode}
          disabled={!isEditorReady}
          style={{ marginLeft: "10px" }}
        >
          Run Code
        </button>
      </div>

      <Editor
        height="60vh"
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
        }}
      >
        <h3>Output:</h3>
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default Compiler;
