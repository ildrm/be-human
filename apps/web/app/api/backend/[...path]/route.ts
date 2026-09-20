import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const apiBase = (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/$/, '');

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = new URL(`${apiBase}/${path.map(encodeURIComponent).join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'cookie', 'x-csrf-token', 'x-request-id']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    ...(request.method === 'GET' || request.method === 'HEAD' ? {} : { body: await request.arrayBuffer() }),
    redirect: 'manual',
    cache: 'no-store',
  });
  const responseHeaders = new Headers();
  for (const name of ['content-type', 'cache-control', 'etag', 'x-request-id', 'retry-after']) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  const cookieHeaders = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const value of cookieHeaders) responseHeaders.append('set-cookie', value);
  if (!cookieHeaders.length) {
    const value = upstream.headers.get('set-cookie');
    if (value) responseHeaders.set('set-cookie', value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
