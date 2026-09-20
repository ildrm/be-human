import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { CanActivate, ConflictException, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';
import argon2 from 'argon2';
import type { FastifyRequest } from 'fastify';
import { DbService } from './db.service.js';

export class CredentialsDto {
  @ApiProperty({ example: 'alex@example.test' }) @IsEmail() email!: string;
  @ApiProperty({ minLength: 12, writeOnly: true }) @IsString() @Length(12, 128) password!: string;
}

export type AuthUser = { id: string; email: string; displayName: string; roles: string[] };
type RequestWithUser = FastifyRequest & { user?: AuthUser };

const sessionSecret = (): string => process.env.SESSION_SECRET ?? 'development-only-secret';
const hashToken = (token: string): string => createHmac('sha256', sessionSecret()).update(token).digest('hex');
const equalHash = (left: string, right: string): boolean => {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};

@Injectable()
export class AuthService {
  private readonly dummyHash = argon2.hash(randomBytes(32), { type: argon2.argon2id, memoryCost: 19_456, timeCost: 3, parallelism: 1 });
  constructor(private readonly db: DbService) {}

  async register(input: CredentialsDto): Promise<AuthUser> {
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 3, parallelism: 1 });
    try {
      const result = await this.db.query<AuthUser & { roles: string[] }>(
        `INSERT INTO app_user(email, password_hash, display_name) VALUES (lower($1), $2, split_part($1, '@', 1)) RETURNING id, email, display_name AS "displayName", ARRAY['user']::text[] AS roles`,
        [input.email, passwordHash],
      );
      return result.rows[0]!;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('An account with this email already exists.');
      throw error;
    }
  }

  async authenticate(input: CredentialsDto): Promise<AuthUser> {
    const result = await this.db.query<AuthUser & { passwordHash: string }>(
      `SELECT u.id, u.email, u.display_name AS "displayName", u.password_hash AS "passwordHash", COALESCE(array_agg(r.role) FILTER (WHERE r.role IS NOT NULL), ARRAY['user']::text[]) AS roles FROM app_user u LEFT JOIN user_role r ON r.user_id=u.id WHERE u.email=lower($1) AND u.status <> 'locked' GROUP BY u.id`, [input.email],
    );
    const record = result.rows[0];
    const verified = await argon2.verify(record?.passwordHash ?? await this.dummyHash, input.password);
    if (!record || !verified) throw new UnauthorizedException('Email or password is incorrect.');
    const { passwordHash: _, ...user } = record;
    return user;
  }

  async createSession(userId: string, metadata: { userAgent?: string; ip?: string }): Promise<{ token: string; csrfToken: string }> {
    const token = randomBytes(32).toString('base64url');
    const csrfToken = randomBytes(24).toString('base64url');
    await this.db.query(`INSERT INTO user_session(user_id, token_hash, csrf_hash, expires_at, user_agent, ip_hash) VALUES ($1, $2, $3, now() + interval '30 days', $4, $5)`, [userId, hashToken(token), hashToken(csrfToken), metadata.userAgent?.slice(0, 300) ?? null, metadata.ip ? hashToken(metadata.ip) : null]);
    return { token, csrfToken };
  }

  async resolveSession(token: string): Promise<AuthUser | null> {
    const result = await this.db.query<AuthUser>(`SELECT u.id, u.email, u.display_name AS "displayName", COALESCE(array_agg(r.role) FILTER (WHERE r.role IS NOT NULL), ARRAY['user']::text[]) AS roles FROM user_session s JOIN app_user u ON u.id=s.user_id LEFT JOIN user_role r ON r.user_id=u.id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status <> 'locked' GROUP BY u.id`, [hashToken(token)]);
    return result.rows[0] ?? null;
  }

  async revoke(token: string): Promise<void> { await this.db.query(`UPDATE user_session SET revoked_at=now() WHERE token_hash=$1`, [hashToken(token)]); }

  async verifyCsrf(token: string, csrfToken: string): Promise<boolean> {
    const result = await this.db.query<{ csrfHash: string }>(`SELECT csrf_hash AS "csrfHash" FROM user_session WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > now()`, [hashToken(token)]);
    const stored = result.rows[0]?.csrfHash;
    return Boolean(stored && equalHash(stored, hashToken(csrfToken)));
  }
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.cookies?.['bh_session'];
    if (!token) throw new UnauthorizedException('Sign in is required.');
    const user = await this.auth.resolveSession(token);
    if (!user) throw new UnauthorizedException('Your session is invalid or expired.');
    request.user = user;
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.cookies?.['bh_session'];
    const cookieToken = request.cookies?.['bh_csrf'];
    const headerToken = request.headers['x-csrf-token'];
    if (!token || !cookieToken || typeof headerToken !== 'string' || cookieToken !== headerToken || !(await this.auth.verifyCsrf(token, headerToken))) {
      throw new ForbiddenException('The request could not be verified. Refresh and try again.');
    }
    return true;
  }
}

export const currentUser = (request: RequestWithUser): AuthUser => {
  if (!request.user) throw new UnauthorizedException();
  return request.user;
};
