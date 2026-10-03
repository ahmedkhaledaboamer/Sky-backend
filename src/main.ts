import { Logger, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer } from 'class-validator';
import compression from 'compression';
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { bodyParserErrorHandler } from './common/middleware/body-parser-error.middleware';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { initImageStorage, UPLOADS_DIR } from './common/uploads/image-storage';
import { serveImages } from './common/uploads/serve-images.middleware';
import type { Connection } from 'mongoose';

async function bootstrap() {
  // body parsing is set up below (JSON only, like the Express app)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const logger = new Logger('Bootstrap');

  // Express 4 parsed nested query strings (?price[gte]=100); Express 5 needs this to keep doing it
  app.set('query parser', 'extended');

  // Enable other domains to access your application (same as cors() defaults)
  app.enableCors();
  // compress all responses
  app.use(compression());
  // Express 5 leaves req.body undefined when there is no body; Express 4 gave {}
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body === undefined) req.body = {};
    next();
  });
  // keep the raw bytes for the Stripe webhook signature check
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(bodyParserErrorHandler);
  // uploaded images: /categories/<file>, /brands/<file>, /products/<file>, /users/<file>
  // stored in MongoDB (GridFS); the uploads/ folder only serves images saved before that
  initImageStorage(app.get<Connection>(getConnectionToken()));
  app.use(serveImages);
  app.useStaticAssets(UPLOADS_DIR);

  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
    logger.log(`mode : ${process.env.NODE_ENV}`);
  }

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'webhook-checkout', method: RequestMethod.POST }],
  });
  // database-backed validators (unique email, category exists ...) are resolved through Nest DI
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  const port = Number(process.env.PORT) || 8000;
  await app.listen(port);
  logger.log(`app running on port ${port}`);

  // Handle Errors Rejections Outside Nest
  process.on('unhandledRejection', (err: Error) => {
    logger.error(`unhandledRejection error ${err?.name} ${err?.message}`);
    void app.close().then(() => {
      logger.error('server shutting down');
      process.exit(1);
    });
  });
}

void bootstrap();
