import { describe, it, expect } from 'vitest';
import { parseRoomId } from '../src/utils/roomId.js';

describe('parseRoomId', () => {
  it('parses user1_user2_timestamp format', () => {
    expect(parseRoomId('legend_titus_1779817468356')).toEqual({
      user1: 'legend',
      user2: 'titus',
      timestamp: 1779817468356,
    });
  });

  it('returns null for invalid format', () => {
    expect(parseRoomId('invalid')).toBeNull();
    expect(parseRoomId('a_b')).toBeNull();
  });
});
