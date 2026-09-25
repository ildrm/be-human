import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { requestContext, requestIdFromHeader } from './request-context.js';

it('uses the Fastify request ID in audit context and the response', async () => {
  const request = { id: 'client-safe-123' } as unknown as FastifyRequest;
  const headers = new Map<string, string>();
  const reply = { header: (name: string, value: string) => { headers.set(name, value); } } as unknown as FastifyReply;
  await requestContext(request, reply);
  assert.equal(request.id, headers.get('x-request-id'));
  assert.equal(headers.get('x-request-id'), 'client-safe-123');
  assert.equal(headers.get('cache-control'), 'no-store');
});

it('accepts safe client request IDs and replaces unsafe ones before Fastify logs', () => {
  assert.equal(requestIdFromHeader('client-safe-123'), 'client-safe-123');
  assert.match(requestIdFromHeader('token?secret=yes'), /^[0-9a-f-]{36}$/);
  assert.match(requestIdFromHeader(['one', 'two']), /^[0-9a-f-]{36}$/);
});
