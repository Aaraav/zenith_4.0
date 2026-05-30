import { describe, it, expect, beforeAll } from 'vitest';

const LCP_ENTRY = {
  name: 'longestCommonPrefix',
  returnType: 'string',
  parameters: [{ name: 'strs', type: 'string[]' }],
};

const LCP_INPUT = '[["hello","hello world","hello dsa"]]';

const JS_SOLUTION = `function longestCommonPrefix(strs) {
  let prefix = strs[0];
  for (let i = 1; i < strs.length; i++) {
    while (!strs[i].startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) return "";
  }
  return prefix;
}`;

const PY_SOLUTION = `def longestCommonPrefix(strs):
    prefix = strs[0]
    for i in range(1, len(strs)):
        while not strs[i].startswith(prefix):
            prefix = prefix[:-1]
            if not prefix:
                return ""
    return prefix`;

const CPP_SOLUTION = `string longestCommonPrefix(vector<string>& strs) {
    string prefix = strs[0];
    for (size_t i = 1; i < strs.size(); i++) {
        while (strs[i].find(prefix) != 0) prefix.pop_back();
        if (prefix.empty()) return "";
    }
    return prefix;
}`;

const JAVA_SOLUTION = `public static String longestCommonPrefix(String[] strs) {
    String prefix = strs[0];
    for (int i = 1; i < strs.length; i++) {
        while (!strs[i].startsWith(prefix)) {
            prefix = prefix.substring(0, prefix.length() - 1);
            if (prefix.isEmpty()) return "";
        }
    }
    return prefix;
}`;

let buildLeetCodeDriver;
let wrapCodeForExecution;
let formatSignature;

beforeAll(async () => {
  buildLeetCodeDriver = (await import('../src/services/leetcodeDriver.js')).buildLeetCodeDriver;
  formatSignature = (await import('../src/services/leetcodeDriver.js')).formatSignature;
  wrapCodeForExecution = (await import('../src/services/compiler.js')).wrapCodeForExecution;
});

describe('buildLeetCodeDriver', () => {
  it('formats function signature', () => {
    expect(formatSignature(LCP_ENTRY)).toBe('string longestCommonPrefix(string[] strs)');
  });

  it('wraps javascript with JSON arg spread — no user JSON.parse', () => {
    const wrapped = buildLeetCodeDriver('javascript', JS_SOLUTION, LCP_ENTRY);
    expect(wrapped).toContain('longestCommonPrefix(...__args)');
    expect(wrapped).toContain('JSON.parse');
    expect(wrapped).not.toContain('function solve');
  });

  it('wraps python with json.loads and *args', () => {
    const wrapped = buildLeetCodeDriver('python', PY_SOLUTION, LCP_ENTRY);
    expect(wrapped).toContain('json.loads');
    expect(wrapped).toContain('longestCommonPrefix(*__args)');
  });

  it('wraps cpp with main harness and typed parse', () => {
    const wrapped = buildLeetCodeDriver('cpp', CPP_SOLUTION, LCP_ENTRY);
    expect(wrapped).toContain('int main()');
    expect(wrapped).toContain('__parseJsonStringArray');
    expect(wrapped).toContain('longestCommonPrefix(__arg0)');
  });

  it('wraps java with Main class harness', () => {
    const wrapped = buildLeetCodeDriver('java', JAVA_SOLUTION, LCP_ENTRY);
    expect(wrapped).toContain('public class Main');
    expect(wrapped).toContain('parseJsonStringArray');
    expect(wrapped).toContain('longestCommonPrefix(__arg0)');
  });
});

describe('wrapCodeForExecution with entryPoint', () => {
  it('uses LeetCode driver when entryPoint is present', () => {
    const wrapped = wrapCodeForExecution('javascript', JS_SOLUTION, LCP_ENTRY);
    expect(wrapped).toContain('longestCommonPrefix(...__args)');
  });

  it('falls back to legacy solve harness without entryPoint', () => {
    const code = 'function solve(input) { return input; }';
    const wrapped = wrapCodeForExecution('javascript', code, null);
    expect(wrapped).toContain('solve(__input)');
  });
});

describe('LCP fixture stdin format', () => {
  it('input is a JSON array of arguments', () => {
    const args = JSON.parse(LCP_INPUT);
    expect(Array.isArray(args)).toBe(true);
    expect(args).toHaveLength(1);
    expect(args[0]).toEqual(['hello', 'hello world', 'hello dsa']);
  });
});
