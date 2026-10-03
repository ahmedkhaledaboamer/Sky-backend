import type { NextFunction, Request, Response } from 'express';
import type { Readable } from 'stream';
import { IMAGE_FOLDERS, ImageFolder, onImageDeleted, openImage } from './image-storage';

const IMAGE_PATH = new RegExp(`^/(${IMAGE_FOLDERS.join('|')})/([\\w.-]+\\.jpe?g)$`);

// File names are unique per upload, so an image never changes: keep the most
// recently used ones in memory instead of reading GridFS on every request.
const CACHE_LIMIT_BYTES = 64 * 1024 * 1024;
const cache = new Map<string, { body: Buffer; etag: string }>();
let cachedBytes = 0;

function remember(key: string, entry: { body: Buffer; etag: string }) {
  if (entry.body.length > CACHE_LIMIT_BYTES / 4) return;
  cache.set(key, entry);
  cachedBytes += entry.body.length;
  // Map keeps insertion order: the first keys are the least recently used
  for (const [oldKey, old] of cache) {
    if (cachedBytes <= CACHE_LIMIT_BYTES) break;
    cache.delete(oldKey);
    cachedBytes -= old.body.length;
  }
}

function recall(key: string) {
  const entry = cache.get(key);
  if (entry) {
    // move to the end (most recently used)
    cache.delete(key);
    cache.set(key, entry);
  }
  return entry;
}

const toBuffer = (stream: Readable) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

async function loadImage(folder: ImageFolder, fileName: string) {
  const key = `${folder}/${fileName}`;
  const cached = recall(key);
  if (cached) return cached;
  const image = await openImage(folder, fileName);
  if (!image) return null;
  const entry = { body: await toBuffer(image.stream), etag: image.etag };
  remember(key, entry);
  return entry;
}

// a deleted image must not keep being served from memory
onImageDeleted((folder, fileName) => {
  const key = `${folder}/${fileName}`;
  const entry = cache.get(key);
  if (!entry) return;
  cache.delete(key);
  cachedBytes -= entry.body.length;
});

// GET /<folder>/<fileName> — serves the image from MongoDB (GridFS) through an
// in-memory cache. Falls through to the static `uploads/` folder for images
// stored before GridFS.
export function serveImages(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const match = IMAGE_PATH.exec(req.path);
  if (!match) return next();
  const [, folder, fileName] = match;

  loadImage(folder as ImageFolder, fileName)
    .then((image) => {
      if (!image) return next();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('ETag', image.etag);
      if (req.headers['if-none-match'] === image.etag) {
        res.status(304).end();
        return;
      }
      res.setHeader('Content-Length', image.body.length);
      res.end(req.method === 'HEAD' ? undefined : image.body);
    })
    .catch(next);
}
