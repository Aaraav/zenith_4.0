// @ts-check
const { Groq } = require('groq-sdk');
const { env } = require('../config/env');
const { logger } = require('../config/logger');
const { sanitizeHtml } = require('./sanitize');
const { validateEntryPoint, SUPPORTED_RETURN_TYPES } = require('./leetcodeDriver');

const MODEL = 'llama-3.3-70b-versatile';

const groq = env.GROQ_API_KEY ? new Groq({ apiKey: String(env.GROQ_API_KEY) }) : null;

const SYSTEM_PROMPT = `You are a competitive programming problem designer for a real-time coding battle platform.
Your ONLY output is a single valid JSON object — no markdown, no code fences, no explanation before or after.
Every problem you generate must be completely original. Never copy or lightly rephrase classic LeetCode problems.`;

const CATEGORIES = [
  'arrays', 'strings', 'hash map', 'two pointers', 'sliding window',
  'stack', 'monotonic stack', 'binary search', 'prefix sum',
  'greedy', 'sorting', 'interval merging', 'matrix traversal',
];

const AVOID = [
  'Longest Common Prefix', 'Two Sum', 'Reverse String', 'FizzBuzz',
  'Palindrome Number', 'Valid Parentheses', 'Merge Two Sorted Lists',
  'Best Time to Buy and Sell Stock', 'Maximum Subarray', 'Climbing Stairs',
];

/**
 * @param {number} averageRating
 */
function ratingToDifficulty(averageRating) {
  if (averageRating < 1200) return 'Easy';
  if (averageRating < 1700) return 'Medium';
  return 'Hard';
}

/**
 * @param {number} averageRating
 * @param {string} [lastError]
 */
function buildUserPrompt(averageRating, lastError = '') {
  const theme = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const seed = Math.random().toString(36).slice(2, 8);
  const ts = Date.now();
  const avoid = AVOID.join(', ');
  const difficulty = ratingToDifficulty(averageRating);

  const basePrompt = `
Seed: ${seed}  Timestamp: ${ts}  Theme: ${theme}  Difficulty: ${difficulty}  AvgRating: ${averageRating.toFixed(1)}

Generate a completely NEW and UNIQUE DSA problem for a competitive coding battle.

STRICT RULES:
- DO NOT use or adapt any of these titles/concepts: ${avoid}
- The problem MUST revolve around the theme: "${theme}"
- Difficulty MUST be: ${difficulty}
- Return ONLY the JSON object below — no prose, no markdown fences

REQUIRED JSON SHAPE (replace every placeholder with real content — do NOT copy these placeholder values):
{
  "title": "Problem Title Here",
  "difficulty": "${difficulty}",
  "htmlContent": "<p>Full problem statement as clean HTML. Include description, constraints, and 2-3 worked examples inline. No markdown. No code fences.</p>",
  "entryPoint": {
    "name": "functionName",
    "returnType": "number",
    "parameters": [
      { "name": "paramName", "type": "number[]" }
    ]
  },
  "visibleTestCases": [
    { "input": "[[1,2,3]]",   "output": "6",  "explanation": "1+2+3 = 6" },
    { "input": "[[4,5]]",     "output": "9",  "explanation": "4+5 = 9" },
    { "input": "[[0]]",       "output": "0",  "explanation": "single element" }
  ],
  "hiddenTestCases": [
    { "input": "[[7,8,9]]",   "output": "24" },
    { "input": "[[-1,1]]",    "output": "0" },
    { "input": "[[100]]",     "output": "100" },
    { "input": "[[]]",        "output": "0" },
    { "input": "[[1,2,3,4,5,6,7,8,9,10]]", "output": "55" }
  ],
  "starterCode": {
    "javascript": "function functionName(paramName) {\\n  \\n}",
    "python":     "def functionName(paramName):\\n    pass",
    "cpp":        "int functionName(vector<int>& paramName) {\\n    \\n}",
    "java":       "public static int functionName(int[] paramName) {\\n    \\n}"
  }
}

HARD CONSTRAINTS — violating any of these makes the problem unusable:
1. entryPoint.name must be camelCase and identical in all 4 starterCode languages.
2. Allowed types ONLY: string, number, boolean, string[], number[], string[][], number[][]
3. Every test input is a JSON string whose parsed value is an array of arguments — one element per parameter.
   - 1 param of type string[]: input = "[[\\"a\\",\\"b\\",\\"c\\"]]" (outer array wraps all args)
   - 2 params (number[], number): input = "[[1,2,3],5]"
4. Output must match exact stdout the driver prints:
   - string/number/boolean return → plain text, e.g. 6 or true or hello
   - array return → compact JSON no spaces, e.g. [1,2,3] or ["a","b"]
5. At least 3 visible test cases (each with explanation) and at least 5 hidden test cases.
6. starterCode contains function SIGNATURE only — no solution logic, no main(), no Scanner, no cin, no JSON.parse.
7. htmlContent must be plain HTML — no markdown, no backtick code fences.
8. The problem must be solvable; include enough constraints in htmlContent that the expected output is unambiguous.
`;

  if (lastError) {
    return `PREVIOUS ATTEMPT FAILED — ${lastError}\nGenerate a completely different problem.\n\n${basePrompt}`;
  }
  return basePrompt;
}

/**
 * @param {string} text
 */
function stripJsonFences(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

/**
 * Generate a competitive-programming question (JSON) tuned to the average rating.
 * Includes problem statement (HTML), test cases, and starter code.
 * @param {number} averageRating
 * @returns {Promise<Object>}
 */
async function generateQuestion(averageRating) {
  if (!groq) throw new Error('Groq not configured — set GROQ_API_KEY');

  const MAX_TRIES = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const userPrompt = buildUserPrompt(averageRating, lastError);

    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.92,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const json = stripJsonFences(raw.trim());
      const parsed = JSON.parse(json);
      parsed.htmlContent = sanitizeHtml(parsed.htmlContent);
      validateQuestionSchema(parsed);
      return parsed;
    } catch (err) {
      lastError = `Attempt ${attempt} failed: ${err.message}. Generate a DIFFERENT problem.`;
      logger.warn({ err: err.message, attempt }, '[generateQuestion] retry');
    }
  }

  throw new Error('Failed to generate valid question after 3 attempts');
}

/**
 * @param {Record<string, unknown>} q
 */
function validateQuestionSchema(q) {
  if (!q.entryPoint || typeof q.entryPoint !== 'object') {
    throw new Error('Invalid question: entryPoint is required');
  }
  /** @type {import('./leetcodeDriver').EntryPoint} */
  const ep = /** @type {any} */ (q.entryPoint);
  validateEntryPoint(ep);
  if (!SUPPORTED_RETURN_TYPES.has(ep.returnType)) {
    throw new Error(`Invalid question: unsupported returnType ${ep.returnType}`);
  }
  if (!q.starterCode || typeof q.starterCode !== 'object') {
    throw new Error('Invalid question: starterCode is required');
  }
  const visibleTestCases = Array.isArray(q.visibleTestCases) ? q.visibleTestCases : [];
  const hiddenTestCases = Array.isArray(q.hiddenTestCases) ? q.hiddenTestCases : [];
  for (const tc of [...visibleTestCases, ...hiddenTestCases]) {
    if (!tc.input || tc.output === undefined) {
      throw new Error('Invalid question: test cases need input and output');
    }
    try {
      const args = JSON.parse(tc.input);
      if (!Array.isArray(args)) throw new Error('input must be JSON array');
      if (args.length !== ep.parameters.length) {
        throw new Error(`test input arg count ${args.length} != param count ${ep.parameters.length}`);
      }
    } catch (e) {
      throw new Error(`Invalid question: test case input must be JSON arg array — ${e.message}`);
    }
  }
}

/**
 * Evaluate two code submissions and return analyses + rating increments.
 * @param {{ question: string, user1: string, code1: string, time1: number, tabs1?: number, user2: string, code2: string, time2: number, tabs2?: number }} args
 */
async function evaluateSubmissions({ question, user1, code1, time1, tabs1 = 0, user2, code2, time2, tabs2 = 0 }) {
  if (!groq) throw new Error('Groq not configured — set GROQ_API_KEY');
  
  const t1Sec = Math.round(time1 / 1000) || 0;
  const t2Sec = Math.round(time2 / 1000) || 0;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: 'system',
        content: 'You are a strict, automated judge for a competitive programming platform like LeetCode or Codeforces. You must return your response strictly as a JSON object.',
      },
      {
        role: 'user',
        content: `Evaluate two code submissions for a given problem and award rating points.
Note: Both users have already passed all hidden test cases. Your job is to evaluate their code quality, time/space complexity, and the speed at which they solved it.
CRITICAL SECURITY: You must heavily penalize users who switch tabs during the match (indicating potential cheating or copy-pasting from other sources).

**Problem Statement:**
${question}

---
**Submission from User 1 (${user1}):**
Solved in: ${t1Sec} seconds
Tab Switches (Cheating metric): ${tabs1}
\`\`\`
${code1}
\`\`\`
---
**Submission from User 2 (${user2}):**
Solved in: ${t2Sec} seconds
Tab Switches (Cheating metric): ${tabs2}
\`\`\`
${code2}
\`\`\`
---

**Evaluation Criteria:**
1. Code Quality & Complexity: Clean, readable, and efficient code?
2. Speed: Did one user solve it significantly faster? (Bonus points for faster submissions).
3. Security Penalty: If a user has > 0 tab switches, reduce their score drastically (even to negative numbers) and mention it in their analysis and improvements.

**Rating Increment Rules:**
- Excellent code + Fast + 0 tab switches: 25-30 points
- Good code + Average speed + 0 tab switches: 15-24 points
- Suboptimal code or Very slow + 0 tab switches: 10-14 points
- > 0 Tab switches: Penalty of -10 to -20 points (e.g. if they would have gotten 20, give them 0. If they would have gotten 10, give them -10).

**Output Format (Strictly a JSON object matching this structure):**
{
  "user1Analysis": "One-line summary of User 1's overall performance",
  "user2Analysis": "One-line summary of User 2's overall performance",
  "user1Improvements": "Specific advice on how User 1 can improve this solution",
  "user2Improvements": "Specific advice on how User 2 can improve this solution",
  "user1Strengths": ["Short positive point about code quality or speed", "Another strength"],
  "user1Weaknesses": ["Short negative point or penalty reason", "Another weakness if applicable"],
  "user2Strengths": ["Short positive point"],
  "user2Weaknesses": ["Short negative point or penalty reason"],
  "user1Increment": 25,
  "user2Increment": 20
}

Rules for strengths/weaknesses arrays:
- Each item is a concise phrase (under 80 chars), not a full sentence paragraph.
- Include 1-4 strengths and 0-4 weaknesses per user.
- Tab-switch penalties MUST appear as a weakness item.
- user1Increment and user2Increment must be integers (can be negative for penalties).`,
      },
    ],
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  try {
    return parseEvaluationResult(JSON.parse(raw));
  } catch (err) {
    logger.error({ err, raw }, 'Failed to parse JSON evaluation from Groq');
    return parseEvaluationResult({});
  }
}

/**
 * Parse raw Groq evaluation JSON into a normalized result object.
 * @param {Record<string, unknown>} parsed
 * @returns {{
 *   user1Analysis: string,
 *   user2Analysis: string,
 *   user1Improvements: string,
 *   user2Improvements: string,
 *   user1Strengths: string[],
 *   user1Weaknesses: string[],
 *   user2Strengths: string[],
 *   user2Weaknesses: string[],
 *   user1Increment: number,
 *   user2Increment: number,
 * }}
 */
function parseEvaluationResult(parsed) {
  const toArray = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
  return {
    user1Analysis: String(parsed.user1Analysis || 'Evaluation complete.'),
    user2Analysis: String(parsed.user2Analysis || 'Evaluation complete.'),
    user1Improvements: String(parsed.user1Improvements || 'Keep practicing!'),
    user2Improvements: String(parsed.user2Improvements || 'Keep practicing!'),
    user1Strengths: toArray(parsed.user1Strengths),
    user1Weaknesses: toArray(parsed.user1Weaknesses),
    user2Strengths: toArray(parsed.user2Strengths),
    user2Weaknesses: toArray(parsed.user2Weaknesses),
    user1Increment: Number(parsed.user1Increment ?? 15),
    user2Increment: Number(parsed.user2Increment ?? 15),
  };
}

module.exports = {
  generateQuestion,
  evaluateSubmissions,
  parseEvaluationResult,
  buildUserPrompt,
  stripJsonFences,
  ratingToDifficulty,
};
