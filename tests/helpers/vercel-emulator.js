// ============================================================
// Minimal emulation of how Vercel serves this project, driven by the
// real frontend/vercel.json (the project's Root Directory is
// "frontend"):
//   • rewrites are applied in order; "/api/:path*" style sources only
//   • the destination is proxied; when its hostname does not resolve
//     the response is what Vercel documents for that case: a 502 with
//     a plain-text body naming DNS_HOSTNAME_NOT_FOUND — not JSON
//   • everything else is served as a static file from frontend/
//
// `hostMap` maps a destination hostname to a local base URL so tests
// can point a rewrite at a locally running backend.
// ============================================================
const dns = require('dns').promises;
const fs = require('fs');
const http = require('http');
const path = require('path');

const FRONTEND = path.join(__dirname, '..', '..', 'frontend');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

function compile(source) {
  const names = [];
  const re = source.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)\*/g, (m, n) => { names.push(n); return '(.*)'; })
    .replace(/:(\w+)/g, (m, n) => { names.push(n); return '([^/]+)'; });
  return { re: new RegExp(`^${re}$`), names };
}

function startVercelEmulator({ port, config, hostMap = {} }) {
  const cfg = config || JSON.parse(fs.readFileSync(path.join(FRONTEND, 'vercel.json'), 'utf8'));
  const rules = (cfg.rewrites || []).map((r) => ({ ...r, ...compile(r.source) }));
  const log = [];
  const server = http.createServer(async (req, res) => {
    const urlPath = req.url.split('?')[0];
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const rule = rules.find((r) => r.re.test(urlPath));
    if (rule) {
      const m = urlPath.match(rule.re);
      let dest = rule.destination;
      rule.names.forEach((n, i) => { dest = dest.replace(new RegExp(`:${n}\\*?`), m[i + 1]); });
      const target = new URL(dest + query);
      const mapped = hostMap[target.hostname];
      log.push({ path: urlPath, destination: target.toString() });
      if (!mapped) {
        try { await dns.lookup(target.hostname); } catch (_) {
          res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'x-vercel-error': 'DNS_HOSTNAME_NOT_FOUND' });
          return res.end('An error occurred with your deployment\n\nDNS_HOSTNAME_NOT_FOUND\n');
        }
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        return res.end('emulator: refusing to proxy to a real external host');
      }
      const up = new URL(target.pathname + target.search, mapped);
      const body = await new Promise((r) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => r(Buffer.concat(c))); });
      const headers = { ...req.headers, host: up.host, 'x-forwarded-for': '203.0.113.7', 'x-forwarded-host': req.headers.host };
      const pr = http.request(up, { method: req.method, headers }, (ur) => { res.writeHead(ur.statusCode, ur.headers); ur.pipe(res); });
      pr.on('error', () => { res.writeHead(502, { 'Content-Type': 'text/plain' }); res.end('An error occurred with your deployment\n\nROUTER_EXTERNAL_TARGET_CONNECTION_ERROR\n'); });
      return pr.end(body);
    }
    const file = path.join(FRONTEND, urlPath === '/' ? 'index.html' : path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
    if (file.startsWith(FRONTEND) && fs.existsSync(file) && fs.statSync(file).isFile() && path.basename(file) !== 'vercel.json') {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      return fs.createReadStream(file).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain', 'x-vercel-error': 'NOT_FOUND' });
    res.end('The page could not be found\n\nNOT_FOUND\n');
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({
    url: `http://localhost:${port}`, log, close: () => new Promise((r) => server.close(r)),
  })));
}

module.exports = { startVercelEmulator };
