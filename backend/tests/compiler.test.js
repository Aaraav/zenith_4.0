import { describe, it, expect, beforeAll } from 'vitest';

let wrapCodeForExecution;

beforeAll(async () => {
  wrapCodeForExecution = (await import('../src/services/compiler.js')).wrapCodeForExecution;
});

describe('wrapCodeForExecution', () => {
  it('wraps javascript solve() with stdin harness', () => {
    const code = 'function solve(input) { return input; }';
    const wrapped = wrapCodeForExecution('javascript', code);
    expect(wrapped).toContain('readFileSync(0');
    expect(wrapped).toContain('console.log(typeof __result');
  });

  it('wraps python solve() with stdin harness', () => {
    const code = 'def solve(input):\n    return input';
    const wrapped = wrapCodeForExecution('python', code);
    expect(wrapped).toContain('sys.stdin.read()');
    expect(wrapped).toContain('print(solve(');
  });

  it('wraps cpp solve() with main harness', () => {
    const code = 'string solve(string input) { return input; }';
    const wrapped = wrapCodeForExecution('cpp', code);
    expect(wrapped).toContain('#include <iostream>');
    expect(wrapped).toContain('int main()');
    expect(wrapped).toContain('solve(input)');
  });

  it('wraps java solve() with Main class harness', () => {
    const code = 'static String solve(String input) { return input; }';
    const wrapped = wrapCodeForExecution('java', code);
    expect(wrapped).toContain('public class Main');
    expect(wrapped).toContain('public static void main');
  });

  it('uses LeetCode driver when entryPoint provided', () => {
    const ep = { name: 'longestCommonPrefix', returnType: 'string', parameters: [{ name: 'strs', type: 'string[]' }] };
    const code = 'function longestCommonPrefix(strs) { return strs[0]; }';
    const wrapped = wrapCodeForExecution('javascript', code, ep);
    expect(wrapped).toContain('longestCommonPrefix(...__args)');
  });

  it('does not double-wrap code that already has main', () => {
    const code = 'int main(){ return 0; }';
    expect(wrapCodeForExecution('cpp', code)).toBe(code);
  });
});
