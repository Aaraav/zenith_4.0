import { describe, it, expect } from 'vitest';

const { parseEvaluationResult } = await import('../src/services/gemini.js');

describe('parseEvaluationResult', () => {
  it('parses strengths, weaknesses, and negative increments', () => {
    const result = parseEvaluationResult({
      user1Analysis: 'Strong performance',
      user2Analysis: 'Tab switch penalty applied',
      user1Strengths: ['Clean O(n) solution', 'Fast submission'],
      user1Weaknesses: [],
      user2Strengths: ['Correct solution'],
      user2Weaknesses: ['8 tab switches detected'],
      user1Increment: 20,
      user2Increment: -10,
    });

    expect(result.user1Strengths).toEqual(['Clean O(n) solution', 'Fast submission']);
    expect(result.user2Weaknesses).toEqual(['8 tab switches detected']);
    expect(result.user1Increment).toBe(20);
    expect(result.user2Increment).toBe(-10);
  });

  it('defaults missing arrays to empty and uses fallback increments', () => {
    const result = parseEvaluationResult({});
    expect(result.user1Strengths).toEqual([]);
    expect(result.user2Weaknesses).toEqual([]);
    expect(result.user1Increment).toBe(15);
    expect(result.user2Increment).toBe(15);
  });
});
