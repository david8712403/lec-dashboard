import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cors from '@fastify/cors';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./dev.db';
  }
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(cors, {
    origin: true,
  });

  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT ?? 3004);
  const host = process.env.HOST ?? '127.0.0.1';

  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (request: any, _reply: any, done: () => void) => {
    request.startTime = Date.now();
    done();
  });
  fastify.addHook('onResponse', (request: any, reply: any, done: () => void) => {
    const duration = request.startTime ? Date.now() - request.startTime : 0;
    logger.log(`${request.method} ${request.url} -> ${reply.statusCode} ${duration}ms`);
    done();
  });

  await app.listen(port, host);
  logger.log(`Server listening on http://${host}:${port}`);
}

bootstrap();
