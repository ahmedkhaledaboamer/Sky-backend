import { Logger } from '@nestjs/common';
import type { Query, Schema } from 'mongoose';
import { toFileName } from '../utils/image-url';
import { deleteImage, ImageFolder } from './image-storage';

const logger = new Logger('ImageCleanup');

type ImageSource = Record<string, unknown> | null | undefined;
type QueryWithPrevious = Query<unknown, unknown> & { _previousImages?: string[] };

/** File names held by `fields` (single values or arrays; URLs are reduced to file names). */
const imagesOf = (doc: ImageSource, fields: string[]): string[] =>
  fields
    .flatMap((field) => {
      const value = doc?.[field];
      return Array.isArray(value) ? value : [value];
    })
    .filter((v): v is string => typeof v === 'string' && v !== '')
    .map((v) => toFileName(v) as string);

// best effort: a failed cleanup must never fail the request
const removeImages = (folder: ImageFolder, names: string[]) => {
  if (!names.length) return;
  Promise.all(names.map((name) => deleteImage(folder, name))).catch((err: Error) =>
    logger.warn(`Could not delete ${folder} images: ${err.message}`),
  );
};

/**
 * Keeps GridFS in sync with the documents that reference images:
 * - deleting a document (document.deleteOne / findOneAndDelete) removes its images
 * - updating a document (findOneAndUpdate) removes images it no longer references
 */
export function applyImageCleanupHooks(schema: Schema, folder: ImageFolder, fields: string[]) {
  schema.post('deleteOne', { document: true, query: false }, function () {
    removeImages(folder, imagesOf(this.toObject({ getters: false }) as ImageSource, fields));
  });

  schema.post('findOneAndDelete', function (doc: { toObject?: () => ImageSource } | null) {
    removeImages(folder, imagesOf(doc?.toObject?.() ?? (doc as ImageSource), fields));
  });

  schema.pre('findOneAndUpdate', async function () {
    const query = this as QueryWithPrevious;
    const update = (query.getUpdate() ?? {}) as Record<string, unknown>;
    const set = { ...update, ...((update.$set as object) ?? {}) } as Record<string, unknown>;
    // only look up the previous images when the update touches an image field
    if (!fields.some((field) => field in set)) return;
    const previous = await query.model.findOne(query.getFilter()).select(fields.join(' ')).lean<ImageSource>();
    query._previousImages = imagesOf(previous, fields);
  });

  schema.post('findOneAndUpdate', async function () {
    const query = this as QueryWithPrevious;
    const previous = query._previousImages;
    if (!previous?.length) return;
    const current = await query.model.findOne(query.getFilter()).select(fields.join(' ')).lean<ImageSource>();
    const kept = new Set(imagesOf(current, fields));
    removeImages(
      folder,
      previous.filter((name) => !kept.has(name)),
    );
  });
}
