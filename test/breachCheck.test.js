import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseRangeResponse } from '../src/breachCheck.js';

describe('breachCheck', () => {
  describe('parseRangeResponse', () => {
    it('parses standard HIBP response format', () => {
      const text = 'AABBCCDDEE:5\r\n1122334455:123\r\nFFEEDDCCBB:0\r\n';
      const result = parseRangeResponse(text);
      assert.equal(result.length, 3);
      assert.deepEqual(result[0], { suffix: 'AABBCCDDEE', count: 5 });
      assert.deepEqual(result[1], { suffix: '1122334455', count: 123 });
      assert.deepEqual(result[2], { suffix: 'FFEEDDCCBB', count: 0 });
    });

    it('handles Unix line endings', () => {
      const text = 'AABBCCDDEE:5\n1122334455:10\n';
      const result = parseRangeResponse(text);
      assert.equal(result.length, 2);
    });

    it('handles empty input', () => {
      const result = parseRangeResponse('');
      assert.equal(result.length, 0);
    });

    it('handles malformed count', () => {
      const result = parseRangeResponse('AABBCCDDEE:abc');
      assert.equal(result[0].count, 0);
    });

    it('uppercases suffixes', () => {
      const result = parseRangeResponse('aabbccddee:1');
      assert.equal(result[0].suffix, 'AABBCCDDEE');
    });
  });
});
