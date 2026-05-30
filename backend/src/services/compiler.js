// @ts-check
const axios = require('axios');
const { env } = require('../config/env');
const { logger } = require('../config/logger');

const API_KEY = env.ONLINE_COMPILER_API_KEY || 'fab918c1e339888ce41a34c2a1e39388';
const BASE_URL = 'https://api.onlinecompiler.io/api/run-code-sync/';

const COMPILER_MAP = {
  javascript: 'typescript-deno',
  python: 'python-3.14',
  cpp: 'g++-15',
  java: 'openjdk-25',
};

/**
 * @param {string} language
 * @param {string} code
 * @param {import('./leetcodeDriver').EntryPoint | null | undefined} [entryPoint]
 */
function wrapCodeForExecution(language, code, entryPoint) {
  const trimmed = code.trim();
  if (!trimmed) return code;

  if (entryPoint?.name && Array.isArray(entryPoint.parameters)) {
    const { buildLeetCodeDriver } = require('./leetcodeDriver');
    return buildLeetCodeDriver(language, trimmed, entryPoint);
  }

  switch (language) {
    case 'javascript':
      if (/function\s+solve\s*\(/.test(trimmed) && !/readFileSync\s*\(\s*0/.test(trimmed) && !/Deno\.stdin/.test(trimmed)) {
        return `${trimmed}\n\nimport * as fs from "node:fs";\nconst __input = fs.readFileSync(0, "utf8");\nconst __result = solve(__input);\nconsole.log(typeof __result === "string" ? __result : String(__result));`;
      }
      return trimmed;

    case 'python':
      if (/def\s+solve\s*\(/.test(trimmed) && !/print\s*\(\s*solve\s*\(/.test(trimmed)) {
        return `${trimmed}\n\nimport sys\nprint(solve(sys.stdin.read()), end="")`;
      }
      return trimmed;

    case 'cpp': {
      if (/int\s+main\s*\(/.test(trimmed)) return trimmed;
      const headers = trimmed.includes('#include') ? '' : '#include <iostream>\n#include <string>\nusing namespace std;\n\n';
      if (/\bsolve\s*\(/.test(trimmed)) {
        return `${headers}${trimmed}\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    string input, line;\n    while (getline(cin, line)) {\n        if (!input.empty()) input += "\\n";\n        input += line;\n    }\n    cout << solve(input);\n    return 0;\n}\n`;
      }
      return trimmed;
    }

    case 'java': {
      if (/public\s+static\s+void\s+main\s*\(/.test(trimmed)) return trimmed;
      if (!/\bsolve\s*\(/.test(trimmed)) return trimmed;

      if (/public\s+class\s+Main/.test(trimmed)) {
        return `${trimmed}\n\n    public static void main(String[] args) {\n        java.util.Scanner sc = new java.util.Scanner(System.in);\n        StringBuilder sb = new StringBuilder();\n        while (sc.hasNextLine()) {\n            if (sb.length() > 0) sb.append("\\n");\n            sb.append(sc.nextLine());\n        }\n        System.out.print(solve(sb.toString()));\n    }\n`;
      }

      return `import java.util.*;\n\npublic class Main {\n${trimmed}\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        StringBuilder sb = new StringBuilder();\n        while (sc.hasNextLine()) {\n            if (sb.length() > 0) sb.append("\\n");\n            sb.append(sc.nextLine());\n        }\n        System.out.print(solve(sb.toString()));\n    }\n}\n`;
    }

    default:
      return trimmed;
  }
}

/**
 * Normalize onlinecompiler.io response fields for callers expecting stdout/stderr.
 * @param {Record<string, unknown>} data
 */
function normalizeResult(data) {
  const output = String(data.output ?? data.stdout ?? '');
  const error = String(data.error ?? data.stderr ?? '');
  return {
    ...data,
    output,
    error,
    stdout: output,
    stderr: error,
  };
}

/**
 * Runs code using the onlinecompiler.io API
 * @param {string} language
 * @param {string} code
 * @param {string} [input]
 * @param {import('./leetcodeDriver').EntryPoint | null} [entryPoint]
 */
async function runCode(language, code, input = '', entryPoint = null) {
  const compiler = COMPILER_MAP[language] || COMPILER_MAP.javascript;
  const wrappedCode = wrapCodeForExecution(language, code, entryPoint);

  try {
    const response = await axios.post(BASE_URL, {
      compiler,
      code: wrappedCode,
      input,
    }, {
      headers: {
        Authorization: API_KEY,
        'Content-Type': 'application/json',
      },
    });

    return normalizeResult(response.data);
  } catch (err) {
    logger.error({ err: err.message, language, compiler }, 'Code execution failed');
    throw new Error(err.response?.data?.message || 'Code execution failed');
  }
}

module.exports = { runCode, wrapCodeForExecution };
