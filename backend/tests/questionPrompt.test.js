import { describe, it, expect } from 'vitest';

const {
  buildUserPrompt,
  stripJsonFences,
  ratingToDifficulty,
} = await import('../src/services/gemini.js');

describe('question generation prompts', () => {
  it('maps rating to difficulty tiers', () => {
    expect(ratingToDifficulty(1000)).toBe('Easy');
    expect(ratingToDifficulty(1400)).toBe('Medium');
    expect(ratingToDifficulty(1800)).toBe('Hard');
  });

  it('buildUserPrompt includes theme, seed, and avoid list', () => {
    const prompt = buildUserPrompt(1350);
    expect(prompt).toContain('Theme:');
    expect(prompt).toContain('Seed:');
    expect(prompt).toContain('Longest Common Prefix');
    expect(prompt).toContain('functionName');
    expect(prompt).not.toContain('longestCommonPrefix');
  });

  it('buildUserPrompt prepends retry context when lastError provided', () => {
    const prompt = buildUserPrompt(1350, 'Attempt 1 failed: bad input');
    expect(prompt).toMatch(/^PREVIOUS ATTEMPT FAILED/);
    expect(prompt).toContain('Generate a completely different problem');
  });

  it('stripJsonFences removes markdown code fences', () => {
    expect(stripJsonFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripJsonFences('{"a":1}')).toBe('{"a":1}');
  });
});
