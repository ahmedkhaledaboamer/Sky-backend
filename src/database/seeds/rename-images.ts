// Converts stored pictures that are not in the API upload format (e.g. seed-woman.png)
// into it (e.g. Users-<uuid>-<timestamp>.jpeg) and updates the database to match.
// Other data is left untouched; images already in the right format are skipped.
//   npm run images:rename
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { existsSync } from 'fs';
import { Connection, Model } from 'mongoose';
import { join } from 'path';
import { Brand } from '../../brands/schemas/brand.schema';
import { Category } from '../../categories/schemas/category.schema';
import { ImageFolder, initImageStorage, isUploadName, saveImage, UPLOADS_DIR } from '../../common/uploads/image-storage';
import { toFileName } from '../../common/utils/image-url';
import { Product } from '../../products/schemas/product.schema';
import { User } from '../../users/schemas/user.schema';
import { SeedModule } from './seed.module';

const logger = new Logger('RenameImages');
const IMAGES_DIR = join(process.cwd(), 'images');
const stats = { converted: 0, skipped: 0, missing: 0 };

// where to look for the original picture: /uploads first, then the seed pictures in /images
const findSource = (folder: ImageFolder, name: string) =>
  [
    join(UPLOADS_DIR, folder, name),
    join(IMAGES_DIR, name.replace(/^seed-/, '')),
    join(IMAGES_DIR, 'brands', name.replace(/^seed-/, '')),
  ].find((p) => existsSync(p));

// returns the new file name, or the old value when it cannot / need not be converted
const convert = async (folder: ImageFolder, value: string | undefined, suffix: string) => {
  if (!value) return value;
  const name = toFileName(value) as string;
  if (isUploadName(folder, name)) {
    stats.skipped += 1;
    return name;
  }
  const source = findSource(folder, name);
  if (!source) {
    stats.missing += 1;
    logger.warn(`missing file: ${folder}/${name}`);
    return value;
  }
  stats.converted += 1;
  return saveImage(source, folder, suffix);
};

// fields: { field: suffix } — array fields get -1, -2 … like the product upload handler
const migrate = async (model: Model<unknown>, folder: ImageFolder, fields: Record<string, string>) => {
  // raw collection: no find/init hooks, so we read and write plain file names
  const docs = await model.collection.find({}).toArray();
  for (const doc of docs) {
    const update: Record<string, unknown> = {};
    for (const [field, suffix] of Object.entries(fields)) {
      const value = doc[field] as string | string[] | undefined;
      if (Array.isArray(value)) {
        update[field] = await Promise.all(value.map((v, i) => convert(folder, v, `-${i + 1}`)));
      } else if (value) {
        update[field] = await convert(folder, value, suffix);
      }
    }
    const changed = Object.keys(update).some((k) => JSON.stringify(update[k]) !== JSON.stringify(doc[k]));
    if (changed) await model.collection.updateOne({ _id: doc._id }, { $set: update });
  }
  logger.log(`${folder}: ${docs.length} documents checked`);
};

async function run() {
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['log', 'error', 'warn'] });
  // converted images are stored in MongoDB (GridFS)
  initImageStorage(app.get<Connection>(getConnectionToken()));
  const model = (name: string) => app.get<Model<unknown>>(getModelToken(name));
  try {
    await migrate(model(Category.name), 'categories', { image: '' });
    await migrate(model(Brand.name), 'brands', { image: '' });
    await migrate(model(Product.name), 'products', { imageCover: '-cover', images: '' });
    await migrate(model(User.name), 'users', { profileImg: '' });
    logger.log(`Converted: ${stats.converted}, already ok: ${stats.skipped}, missing: ${stats.missing}`);
  } catch (error) {
    logger.error(error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void run();
