import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

// memory storage + images only (port of middleWares/uploadImageMiddleWares.js)
export const imageUploadOptions: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new BadRequestException('only images allowed'), false);
    }
  },
};
