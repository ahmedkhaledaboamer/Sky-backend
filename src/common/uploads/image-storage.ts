import { randomUUID } from 'crypto';
import { join } from 'path';
import { Connection, mongo } from 'mongoose';
import sharp from 'sharp';
import type { Readable } from 'stream';

// Legacy location: images used to be written here and served statically.
// New images are stored in MongoDB (GridFS); this folder is only a read fallback.
export const UPLOADS_DIR = join(process.cwd(), 'uploads');

export type ImageFolder = 'categories' | 'brands' | 'products' | 'users';
export const IMAGE_FOLDERS: ImageFolder[] = ['categories', 'brands', 'products', 'users'];

interface ImageStyle {
  prefix: string;
  size: number;
  quality: number;
  contain?: boolean;
}

// File-name prefix + sharp pipeline per folder (identical to the Express upload handlers)
export const IMAGE_STYLES: Record<ImageFolder, ImageStyle> = {
  categories: { prefix: 'category', size: 600, quality: 95 },
  brands: { prefix: 'brands', size: 600, quality: 95, contain: true },
  products: { prefix: 'products', size: 1000, quality: 90, contain: true },
  users: { prefix: 'Users', size: 600, quality: 95 },
};

const white = { r: 255, g: 255, b: 255, alpha: 1 };

// ---- GridFS bucket ----------------------------------------------------------
// Images live in the database (collections images.files / images.chunks) so the
// API can be deployed on hosts without a persistent disk. Files are stored as
// "<folder>/<fileName>" and served at the same public URL as before:
// `${BASE_URL}/<folder>/<fileName>`.

let connection: Connection | null = null;
let bucket: mongo.GridFSBucket | null = null;

/** Called once at startup (API and seed scripts) with the Nest mongoose connection. */
export function initImageStorage(conn: Connection): void {
  connection = conn;
  bucket = null;
}

function getBucket(): mongo.GridFSBucket {
  if (!bucket) {
    if (!connection?.db) throw new Error('Image storage is not initialized (no database connection)');
    bucket = new mongo.GridFSBucket(connection.db, { bucketName: 'images' });
  }
  return bucket;
}

const storedName = (folder: ImageFolder, fileName: string) => `${folder}/${fileName}`;

// Resizes an image (buffer or file path), stores it in GridFS and returns the file name,
// e.g. category-<uuid>-<timestamp>.jpeg / products-<uuid>-<timestamp>-cover.jpeg
export const saveImage = async (input: Buffer | string, folder: ImageFolder, suffix = ''): Promise<string> => {
  const { prefix, size, quality, contain } = IMAGE_STYLES[folder];
  const fileName = `${prefix}-${randomUUID()}-${Date.now()}${suffix}.jpeg`;

  let image = sharp(input);
  image = contain ? image.resize(size, size, { fit: 'contain', background: white }) : image.resize(size, size);
  // JPEG has no transparency: fill transparent areas with white instead of black
  image = image.flatten({ background: '#ffffff' });
  const buffer = await image.toFormat('jpeg').jpeg({ quality }).toBuffer();

  await new Promise<void>((resolve, reject) => {
    getBucket()
      .openUploadStream(storedName(folder, fileName), { metadata: { folder, contentType: 'image/jpeg' } })
      .on('error', reject)
      .on('finish', () => resolve())
      .end(buffer);
  });
  return fileName;
};

// set by serve-images.middleware so deleted images leave its memory cache too
let onDelete: ((folder: ImageFolder, fileName: string) => void) | null = null;
export const onImageDeleted = (listener: (folder: ImageFolder, fileName: string) => void) => {
  onDelete = listener;
};

/** Removes a stored image (no-op when it does not exist). */
export const deleteImage = async (folder: ImageFolder, fileName: string): Promise<void> => {
  onDelete?.(folder, fileName);
  const files = await getBucket().find({ filename: storedName(folder, fileName) }).toArray();
  await Promise.all(files.map((file) => getBucket().delete(file._id)));
};

/** Opens a stored image for streaming, or returns null when it is not in the database. */
export const openImage = async (
  folder: ImageFolder,
  fileName: string,
): Promise<{ stream: Readable; length: number; etag: string } | null> => {
  const [file] = await getBucket()
    .find({ filename: storedName(folder, fileName) })
    .sort({ uploadDate: -1 })
    .limit(1)
    .toArray();
  if (!file) return null;
  return {
    stream: getBucket().openDownloadStream(file._id),
    length: file.length,
    etag: `"${file._id.toString()}"`,
  };
};

// true when the name already looks like an API upload, e.g. Users-<uuid>-<timestamp>.jpeg
export const isUploadName = (folder: ImageFolder, name: string) =>
  new RegExp(`^${IMAGE_STYLES[folder].prefix}-[0-9a-f-]{36}-\\d+(-[\\w]+)?\\.jpeg$`).test(name);
