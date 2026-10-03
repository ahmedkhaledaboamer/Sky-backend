import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { from, Observable, switchMap } from 'rxjs';
import { saveImage } from '../../common/uploads/image-storage';
import { toFileName } from '../../common/utils/image-url';

type Body = Record<string, unknown>;
type UploadedFiles = Partial<Record<'imageCover' | 'images', Express.Multer.File[]>>;

// Accepts JSON-encoded or repeated multipart fields, e.g. colors, subcategories, benefits
const parseList = (value: unknown): unknown[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && /^\s*[[{]/.test(value)) {
    try {
      return JSON.parse(value) as unknown[];
    } catch {
      return [value];
    }
  }
  return [value];
};

// Port of parseProductBody
const parseProductBody = (body: Body) => {
  ['colors', 'subcategories', 'benefits', 'ingredients', 'sizes'].forEach((field) => {
    if (field in body) body[field] = parseList(body[field]) ?? [];
  });
  if (typeof body.directions === 'string') {
    try {
      body.directions = JSON.parse(body.directions);
    } catch {
      body.directions = { en: body.directions };
    }
  }
  if (body.brand === '') body.brand = null;
  if (body.priceAfterDiscount === '') body.priceAfterDiscount = null;
};

// Port of resizeProductImages
const resizeProductImages = async (body: Body, files: UploadedFiles) => {
  if (files.imageCover) {
    body.imageCover = await saveImage(files.imageCover[0].buffer, 'products', '-cover');
  } else if (body.imageCover) {
    body.imageCover = toFileName(body.imageCover as string);
  }

  // existing images the client wants to keep (URLs or file names)
  const kept = (parseList(body.images) ?? [])
    .filter((v): v is string => typeof v === 'string')
    .map((v) => toFileName(v) as string);

  if (files.images) {
    const uploaded = await Promise.all(
      files.images.map((img, index) => saveImage(img.buffer, 'products', `-${index + 1}`)),
    );
    body.images = [...kept, ...uploaded];
  } else if ('images' in body) {
    body.images = kept;
  }
};

// Runs after FileFieldsInterceptor and before validation (same order as the Express middlewares)
@Injectable()
export class ProductImagesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const body = (req.body ?? {}) as Body;
    req.body = body;
    parseProductBody(body);
    const files = (req.files ?? {}) as UploadedFiles;
    return from(resizeProductImages(body, files)).pipe(switchMap(() => next.handle()));
  }
}
