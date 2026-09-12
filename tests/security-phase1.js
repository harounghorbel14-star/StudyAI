const assert = require('assert');
const { isBlockedAddress, safeRequest } = require('../backend/security/safe-http');

(async () => {
  for (const address of ['127.0.0.1', '10.0.0.2', '172.16.0.1', '192.168.1.1', '169.254.169.254', '::1', 'fd00::1']) {
    assert.equal(isBlockedAddress(address), true, `${address} must be blocked`);
  }
  for (const address of ['8.8.8.8', '1.1.1.1']) {
    assert.equal(isBlockedAddress(address), false, `${address} should not be classified as private`);
  }
  await assert.rejects(() => safeRequest('file:///etc/passwd'), /Only http and https/);
  await assert.rejects(() => safeRequest('http://127.0.0.1/'), /private|not allowed/);
  console.log('Phase 1 SSRF checks passed');
})();
