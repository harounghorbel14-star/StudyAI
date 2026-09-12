const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');

const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

function isBlockedAddress(address) {
  const normalized = String(address).toLowerCase().replace(/^::ffff:/, '');
  if (normalized === '::1' || normalized === 'localhost') return true;
  if (net.isIPv4(normalized)) {
    const [a, b] = normalized.split('.').map(Number);
    return a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) ||
      (a === 0) || (a === 192 && b === 0) || (a === 198 && b === 51) ||
      (a === 203 && b === 0);
  }
  if (net.isIPv6(normalized)) {
    return normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') ||
      normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') ||
      normalized.startsWith('feb') || normalized.startsWith('2001:db8:') || normalized.startsWith('ff');
  }
  return true;
}

async function resolvePublicHost(hostname) {
  if (!hostname || hostname === 'localhost' || net.isIP(hostname) && isBlockedAddress(hostname)) {
    throw new Error('Destination host is not allowed');
  }
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new Error('Destination resolves to a private or reserved address');
  }
  return addresses.map(({ address }) => address);
}

function requestResolved(url, method, body, headers, timeoutMs) {
  return resolvePublicHost(url.hostname).then((addresses) => new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const address = addresses[0];
    const request = transport.request({
      protocol: url.protocol,
      hostname: address,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method,
      headers: { ...headers, Host: url.host },
      servername: url.hostname,
      rejectUnauthorized: true,
      timeout: timeoutMs,
    }, (response) => {
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          request.destroy(new Error('Response exceeds size limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({
        status: response.statusCode || 0,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('timeout', () => request.destroy(new Error('Outbound request timed out')));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  }));
}

async function safeRequest(rawUrl, options = {}) {
  let url = new URL(rawUrl);
  const method = options.method || 'GET';
  const body = options.body || null;
  const headers = options.headers || {};
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https URLs are allowed');
    const response = await requestResolved(url, method, body, headers, timeoutMs);
    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { ...response, url: url.toString() };
    }
    const location = response.headers.location;
    if (!location || redirects === MAX_REDIRECTS) throw new Error('Too many or invalid redirects');
    url = new URL(location, url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Redirect to a disallowed protocol');
  }
  throw new Error('Too many redirects');
}

module.exports = { safeRequest, isBlockedAddress, resolvePublicHost };
