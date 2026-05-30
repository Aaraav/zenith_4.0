import { describe, it, expect } from 'vitest';

const { normalizeTestOutput, outputsMatch } = await import('../src/utils/testOutput.js');

describe('testOutput', () => {
  it('strips surrounding double quotes from expected output', () => {
    expect(outputsMatch('hello', '"hello"')).toBe(true);
  });

  it('strips surrounding single quotes', () => {
    expect(outputsMatch('a', "'a'")).toBe(true);
  });

  it('trims whitespace', () => {
    expect(outputsMatch('hello\n', ' hello ')).toBe(true);
  });

  it('returns false for genuinely different values', () => {
    expect(outputsMatch('hello', 'world')).toBe(false);
  });
});
