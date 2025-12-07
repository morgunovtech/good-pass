import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getTempMailConfigStatus } from '../functions/lib/tempMailProvider.js';

describe('getTempMailConfigStatus', () => {
  it('requires api key when flagged', () => {
    const status = getTempMailConfigStatus({ TEMP_MAIL_API_BASE_URL: 'https://api.test', TEMP_MAIL_API_REQUIRE_KEY: 'true' });
    assert.equal(status.ok, false);
    assert.deepEqual(status.missing, ['TEMP_MAIL_API_KEY']);
  });

  it('is ok when required values are present', () => {
    const status = getTempMailConfigStatus({
      TEMP_MAIL_API_BASE_URL: 'https://api.test',
      TEMP_MAIL_API_REQUIRE_KEY: 'true',
      TEMP_MAIL_API_KEY: 'demo',
    });
    assert.equal(status.ok, true);
    assert.deepEqual(status.missing, []);
  });

  it('is ok with default provider when env is empty', () => {
    const status = getTempMailConfigStatus({});
    assert.equal(status.ok, true);
    assert.equal(status.missing.length, 0);
    assert.ok(status.baseUrl.includes('1secmail'));
  });
});
