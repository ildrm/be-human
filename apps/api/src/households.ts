import { createHmac, randomBytes } from 'node:crypto';
import { Body, ConflictException, Controller, Delete, Get, HttpCode, Injectable, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { CsrfGuard, SessionGuard, currentUser } from './auth.js';
import { DbService } from './db.service.js';

const memberRoles = ['member', 'guardian', 'dependent', 'administrator'] as const;
const shareableResources = ['calendar', 'goal', 'plan', 'life_event'] as const;
const permissions = ['view', 'edit', 'coordinate'] as const;
const tokenHash = (token: string) => createHmac('sha256', process.env.SESSION_SECRET ?? 'development-only-secret').update(token).digest('hex');

class HouseholdIdDto { @IsUUID() householdId!: string; }
class ShareIdDto { @IsUUID() id!: string; }
class InviteTokenDto { @IsString() @Length(32, 256) token!: string; }
class CreateHouseholdDto { @IsString() @Length(1, 120) name!: string; }
class InvitationDto {
  @IsIn(memberRoles) role!: (typeof memberRoles)[number];
  @IsOptional() @IsEmail() email?: string;
}
class ShareDto {
  @IsUUID() granteeUserId!: string;
  @IsIn(shareableResources) resourceType!: (typeof shareableResources)[number];
  @IsIn(permissions) permission!: (typeof permissions)[number];
  @IsOptional() @IsDateString() expiresAt?: string;
}

@Injectable()
export class ResourcePolicyService {
  constructor(private readonly db: DbService) {}
  async canAccess(ownerUserId: string, actorUserId: string, resourceType: string, required: 'view' | 'edit' | 'coordinate' = 'view'): Promise<boolean> {
    if (ownerUserId === actorUserId) return true;
    const accepted = required === 'view' ? ['view', 'edit', 'coordinate'] : required === 'edit' ? ['edit', 'coordinate'] : ['coordinate'];
    const result = await this.db.query(`SELECT 1 FROM sharing_permission WHERE owner_user_id=$1 AND grantee_user_id=$2 AND resource_type=$3 AND permission=ANY($4::text[]) AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())`, [ownerUserId, actorUserId, resourceType, accepted]);
    return Boolean(result.rowCount);
  }
}

@ApiTags('households') @ApiCookieAuth() @UseGuards(SessionGuard) @Controller('api/v1/households')
export class HouseholdsController {
  constructor(private readonly db: DbService) {}

  @Get() async list(@Req() request: FastifyRequest) {
    const result = await this.db.query(`SELECT h.id,h.name,m.role,m.valid_from AS "joinedAt" FROM household_member m JOIN household h ON h.id=m.household_id WHERE m.user_id=$1 AND m.valid_to IS NULL ORDER BY h.created_at`, [currentUser(request).id]);
    return { data: result.rows };
  }

  @Post() @UseGuards(CsrfGuard) async create(@Body() input: CreateHouseholdDto, @Req() request: FastifyRequest) {
    const userId = currentUser(request).id;
    const data = await this.db.transaction(async (client) => {
      const result = await client.query<{ id: string; name: string }>(`INSERT INTO household(name,created_by) VALUES ($1,$2) RETURNING id,name`, [input.name.trim(), userId]);
      const household = result.rows[0]!;
      await client.query(`INSERT INTO household_member(household_id,user_id,role) VALUES ($1,$2,'administrator')`, [household.id, userId]);
      await client.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'create','household',$2,$3)`, [userId, household.id, request.id]);
      return { ...household, role: 'administrator' };
    });
    return { data };
  }

  @Get(':householdId/members') async members(@Param() params: HouseholdIdDto, @Req() request: FastifyRequest) {
    const userId = currentUser(request).id;
    const membership = await this.db.query(`SELECT 1 FROM household_member WHERE household_id=$1 AND user_id=$2 AND valid_to IS NULL`, [params.householdId, userId]);
    if (!membership.rowCount) throw new NotFoundException('Household not found.');
    const result = await this.db.query(`SELECT u.id,u.display_name AS "displayName",m.role FROM household_member m JOIN app_user u ON u.id=m.user_id WHERE m.household_id=$1 AND m.valid_to IS NULL ORDER BY m.valid_from`, [params.householdId]);
    return { data: result.rows };
  }

  @Post(':householdId/invitations') @UseGuards(CsrfGuard) async invite(@Param() params: HouseholdIdDto, @Body() input: InvitationDto, @Req() request: FastifyRequest) {
    const userId = currentUser(request).id;
    const admin = await this.db.query(`SELECT 1 FROM household_member WHERE household_id=$1 AND user_id=$2 AND role='administrator' AND valid_to IS NULL`, [params.householdId, userId]);
    if (!admin.rowCount) throw new NotFoundException('Household not found.');
    const token = randomBytes(32).toString('base64url');
    const result = await this.db.query<{ id: string; expiresAt: string }>(`INSERT INTO household_invitation(household_id,created_by,invited_email,token_hash,role,expires_at) VALUES ($1,$2,$3,$4,$5,now()+interval '7 days') RETURNING id,expires_at AS "expiresAt"`, [params.householdId, userId, input.email?.toLowerCase() ?? null, tokenHash(token), input.role]);
    await this.db.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,metadata,request_id) VALUES ($1,'invite','household',$2,$3,$4)`, [userId, params.householdId, JSON.stringify({ invitationId: result.rows[0]!.id, role: input.role }), request.id]);
    return { data: { invitationId: result.rows[0]!.id, token, expiresAt: result.rows[0]!.expiresAt } };
  }

  @Post('invitations/:token/accept') @UseGuards(CsrfGuard) async accept(@Param() params: InviteTokenDto, @Req() request: FastifyRequest) {
    const user = currentUser(request);
    const data = await this.db.transaction(async (client) => {
      const invitation = await client.query<{ id: string; householdId: string; role: string; invitedEmail: string | null }>(`SELECT id,household_id AS "householdId",role,invited_email AS "invitedEmail" FROM household_invitation WHERE token_hash=$1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() FOR UPDATE`, [tokenHash(params.token)]);
      const item = invitation.rows[0];
      if (!item || (item.invitedEmail && item.invitedEmail !== user.email.toLowerCase())) throw new NotFoundException('Invitation is invalid or expired.');
      await client.query(`INSERT INTO household_member(household_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [item.householdId, user.id, item.role]);
      await client.query(`UPDATE household_invitation SET accepted_by=$1,accepted_at=now() WHERE id=$2`, [user.id, item.id]);
      await client.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,metadata,request_id) VALUES ($1,'accept_invitation','household',$2,$3,$4)`, [user.id, item.householdId, JSON.stringify({ invitationId: item.id }), request.id]);
      return { householdId: item.householdId, role: item.role };
    });
    return { data };
  }

  @Get('sharing') async shares(@Req() request: FastifyRequest) {
    const userId = currentUser(request).id;
    const result = await this.db.query(`SELECT s.id,s.owner_user_id AS "ownerUserId",s.grantee_user_id AS "granteeUserId",u.display_name AS "granteeName",s.resource_type AS "resourceType",s.permission,s.expires_at AS "expiresAt",s.created_at AS "createdAt" FROM sharing_permission s JOIN app_user u ON u.id=s.grantee_user_id WHERE s.owner_user_id=$1 AND s.revoked_at IS NULL ORDER BY s.created_at DESC`, [userId]);
    return { data: result.rows };
  }

  @Post(':householdId/sharing') @UseGuards(CsrfGuard) async share(@Param() params: HouseholdIdDto, @Body() input: ShareDto, @Req() request: FastifyRequest) {
    const userId = currentUser(request).id;
    if (input.granteeUserId === userId) throw new ConflictException('You already own this data.');
    const sameHousehold = await this.db.query(`SELECT 1 FROM household_member owner JOIN household_member grantee ON grantee.household_id=owner.household_id WHERE owner.household_id=$1 AND owner.user_id=$2 AND grantee.user_id=$3 AND owner.valid_to IS NULL AND grantee.valid_to IS NULL`, [params.householdId, userId, input.granteeUserId]);
    if (!sameHousehold.rowCount) throw new NotFoundException('Household member not found.');
    try {
      const result = await this.db.query(`INSERT INTO sharing_permission(owner_user_id,grantee_user_id,resource_type,permission,expires_at) VALUES ($1,$2,$3,$4,$5) RETURNING id,resource_type AS "resourceType",permission,expires_at AS "expiresAt"`, [userId, input.granteeUserId, input.resourceType, input.permission, input.expiresAt ?? null]);
      await this.db.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,metadata,request_id) VALUES ($1,'grant','sharing_permission',$2,$3,$4)`, [userId, result.rows[0]!.id, JSON.stringify({ resourceType: input.resourceType, permission: input.permission }), request.id]);
      return { data: result.rows[0] };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('An active grant already exists for this resource.');
      throw error;
    }
  }

  @Delete('sharing/:id') @UseGuards(CsrfGuard) @HttpCode(204) async revoke(@Param() params: ShareIdDto, @Req() request: FastifyRequest) {
    const userId = currentUser(request).id;
    const result = await this.db.query(`UPDATE sharing_permission SET revoked_at=now() WHERE id=$1 AND owner_user_id=$2 AND revoked_at IS NULL RETURNING id`, [params.id, userId]);
    if (!result.rowCount) throw new NotFoundException('Sharing permission not found.');
    await this.db.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'revoke','sharing_permission',$2,$3)`, [userId, params.id, request.id]);
  }
}
