import http from 'node:http';
import { createReadStream, watch } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');
const publicDirWithSep = publicDir.endsWith(path.sep) ? publicDir : `${publicDir}${path.sep}`;
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const watchMode = process.argv.includes('--watch');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const decodedPath = decodeURIComponent(url.pathname);
    let filePath = path.resolve(publicDir, `.${decodedPath}`);

    if (filePath !== publicDir && !filePath.startsWith(publicDirWithSep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch (error) {
      filePath = path.join(publicDir, 'index.html');
      fileStat = await stat(filePath);
    }

    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] ?? 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });

    const stream = createReadStream(filePath);
    stream.on('error', (error) => {
      console.error('stream_error', error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
    });
    stream.pipe(res);
  } catch (error) {
    console.error('request_error', error);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(port, host, () => {
  console.info(`🚀  Локальный просмотр доступен на http://${host}:${port}`);
});

if (watchMode) {
  console.info('ℹ️  Watch mode: при изменении файлов перезапустите страницу вручную.');
  try {
    watch(publicDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      console.info(`🔄  Обновлён файл: ${filename} (${eventType})`);
    });
  } catch (error) {
    console.warn('⚠️  Не удалось включить рекурсивный просмотр, обновляйте вручную.', error.message);
  }
}
