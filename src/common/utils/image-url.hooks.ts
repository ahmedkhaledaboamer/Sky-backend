import type { Schema } from 'mongoose';
import { toFileName, toImageUrl } from './image-url';

interface ImageFields {
  single?: string[];
  multiple?: string[];
}

type ImageDoc = Record<string, unknown> & { get?: unknown };

// Documents keep only file names in MongoDB but expose full URLs
// (post init / post save => URL, pre save => file name), as the Express models did.
export function applyImageUrlHooks(schema: Schema, folder: string, { single = [], multiple = [] }: ImageFields) {
  const setImageUrl = (doc: ImageDoc) => {
    single.forEach((field) => {
      if (doc[field]) doc[field] = toImageUrl(folder, doc[field] as string);
    });
    multiple.forEach((field) => {
      const values = doc[field] as string[] | undefined;
      if (values) doc[field] = values.map((value) => toImageUrl(folder, value));
    });
  };

  schema.post('init', (doc) => setImageUrl(doc as unknown as ImageDoc));
  schema.post('save', (doc) => setImageUrl(doc as unknown as ImageDoc));
  // store file names only, never the public URLs
  schema.pre('save', function () {
    const doc = this as unknown as ImageDoc;
    single.forEach((field) => {
      doc[field] = toFileName(doc[field] as string);
    });
    multiple.forEach((field) => {
      const values = doc[field] as string[] | undefined;
      if (values) doc[field] = values.map((value) => toFileName(value));
    });
  });
}
