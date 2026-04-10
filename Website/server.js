const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = 3001;
const ROOT = __dirname;
const PORTAL_ROOT = path.join(__dirname, '..', 'ContractPortal');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

// Security headers applied to every response
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// File extensions that benefit from compression
const compressible = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt']);

// Cache durations by extension (seconds)
function getCacheControl(ext) {
  if (ext === '.html') return 'no-cache';
  if (['.css', '.js'].includes(ext)) return 'public, max-age=86400'; // 1 day
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff2', '.woff'].includes(ext)) return 'public, max-age=2592000'; // 30 days
  return 'no-cache';
}

http.createServer((req, res) => {
  // Only allow GET and HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain', ...securityHeaders });
    res.end('Method Not Allowed');
    return;
  }

  // Parse URL and strip query string
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  let filePath;
  let baseDir;
  if (urlPath === '/portal' || urlPath === '/portal/') {
    filePath = path.join(PORTAL_ROOT, 'index.html');
    baseDir = PORTAL_ROOT;
  } else if (urlPath.startsWith('/portal/')) {
    filePath = path.join(PORTAL_ROOT, urlPath.slice('/portal'.length));
    baseDir = PORTAL_ROOT;
  } else {
    filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    baseDir = ROOT;
  }

  // Resolve to absolute path and prevent path traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(baseDir))) {
    res.writeHead(403, { 'Content-Type': 'text/plain', ...securityHeaders });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(resolved);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain', ...securityHeaders });
      res.end('Not found');
      return;
    }

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': getCacheControl(ext),
      ...securityHeaders,
    };

    // GZIP compression for text-based assets
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (compressible.has(ext) && acceptEncoding.includes('gzip')) {
      zlib.gzip(data, (gzErr, compressed) => {
        if (gzErr) {
          res.writeHead(200, headers);
          res.end(data);
          return;
        }
        headers['Content-Encoding'] = 'gzip';
        headers['Vary'] = 'Accept-Encoding';
        res.writeHead(200, headers);
        res.end(compressed);
      });
    } else {
      res.writeHead(200, headers);
      res.end(data);
    }
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
