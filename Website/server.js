const http = require('http');
const fs = require('fs');
const path = require('path');

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
};

http.createServer((req, res) => {
  let filePath;
  if (req.url === '/portal' || req.url === '/portal/') {
    filePath = path.join(PORTAL_ROOT, 'index.html');
  } else if (req.url.startsWith('/portal/')) {
    filePath = path.join(PORTAL_ROOT, req.url.slice('/portal'.length));
  } else {
    filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  }
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
