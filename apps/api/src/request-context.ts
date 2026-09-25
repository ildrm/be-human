import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export function requestIdFromHeader(supplied: unknown): string {
  return typeof supplied === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(supplied) ? supplied : randomUUID();
}

export async function requestContext(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.header('x-request-id', request.id);
  reply.header('cache-control', 'no-store');
}
