import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Type, mixin } from '@nestjs/common';
import type { Request } from 'express';
import { from, Observable, switchMap } from 'rxjs';
import { ImageFolder, saveImage } from './image-storage';

interface ResizeOptions {
  // body field that receives the stored file name
  field: string;
  folder: ImageFolder;
  // drop a client-sent value when no file was uploaded (keeps the current image on update)
  keepCurrentWhenMissing?: boolean;
}

// Runs after FileInterceptor and before validation, exactly like the Express
// `resizeImage` middlewares: the stored file name is put on req.body[field].
export function ResizeImageInterceptor(options: ResizeOptions): Type<NestInterceptor> {
  @Injectable()
  class ResizeImageMixin implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
      const req = context.switchToHttp().getRequest<Request>();
      return from(this.process(req)).pipe(switchMap(() => next.handle()));
    }

    private async process(req: Request): Promise<void> {
      const body = req.body as Record<string, unknown>;
      if (!req.file) {
        if (options.keepCurrentWhenMissing) delete body[options.field];
        return;
      }
      body[options.field] = await saveImage(req.file.buffer, options.folder);
    }
  }
  return mixin(ResizeImageMixin);
}
