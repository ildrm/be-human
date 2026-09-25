import 'reflect-metadata';
import type { IncomingMessage } from 'node:http';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { requestContext, requestIdFromHeader } from './request-context.js';

async function bootstrap(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || /development-only|replace-with/i.test(process.env.SESSION_SECRET))) {
    throw new Error('SESSION_SECRET must be a unique value of at least 32 characters in production.');
  }
  const adapter = new FastifyAdapter({ logger: { level: process.env.LOG_LEVEL ?? 'info', redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'] }, genReqId: (request: IncomingMessage) => requestIdFromHeader(request.headers['x-request-id']), trustProxy: process.env.TRUST_PROXY ?? 'loopback', bodyLimit: 1_048_576 });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);
  await app.register(cookie);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { global: true, max: 120, timeWindow: '1 minute', ban: 3, keyGenerator: (request) => request.ip });
  app.getHttpAdapter().getInstance().addHook('onRequest', requestContext);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: (errors) => new BadRequestException({ code: 'VALIDATION_FAILED', message: 'Please check the highlighted information.', details: errors.map((error) => ({ field: error.property, constraints: error.constraints })) }) }));
  app.enableShutdownHooks();
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true') {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Be Human API').setDescription('Evidence-governed life-fit planning. Not diagnostic or emergency healthcare.').setVersion('1.0').addCookieAuth('bh_session').build());
    SwaggerModule.setup('docs', app, document);
  }
  await app.listen(Number(process.env.API_PORT ?? 3001), '0.0.0.0');
}

void bootstrap();
