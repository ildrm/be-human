import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

export async function requestContext(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const supplied = request.headers['x-request-id'];
  const requestId = typeof supplied === 'string' && /^[a-zA-Z0-9._-]{1,80}$/.test(supplied) ? supplied : randomUUID();
  reply.header('x-request-id', requestId);
}
