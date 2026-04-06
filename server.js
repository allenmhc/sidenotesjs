// Simple static file server for the demo
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3456;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.map':  'application/json',
};

createServer(async (req, res) => {
  if (req.url === '/') {
    res.writeHead(302, { Location: '/demo/index.html' });
    res.end();
    return;
  }
  let urlPath = req.url;
  const filePath = join(__dirname, urlPath);
  try {
    const data = await readFile(filePath);
    const mime = MIME[extname(filePath)] ?? 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`Demo server running at http://localhost:${PORT}`);
});
