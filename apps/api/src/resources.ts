import {
  Body, ConflictException, Controller, Delete, Get, HttpCode, Injectable, NotFoundException,
  Param, ParseUUIDPipe, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, IsTimeZone, IsUUID,
  Length, MaxLength, Min,
} from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { CsrfGuard, SessionGuard, currentUser } from './auth.js';
import { DbService } from './db.service.js';
import { ResourcePolicyService } from './households.js';

const goalLevels = ['value', 'direction', 'outcome', 'project', 'behaviour', 'habit', 'action'] as const;
const goalStatuses = ['active', 'paused', 'completed', 'archived'] as const;
type GoalRow = {
  id: string; level: (typeof goalLevels)[number]; title: string; reason: string | null;
  status: (typeof goalStatuses)[number]; minimumViableVersion: string | null; fallbackPlan: string | null;
  recoveryRule: string | null; targetDate: string | null; version: number; createdAt: string; updatedAt: string;
};

export class CreateGoalDto {
  @IsIn(goalLevels) level!: (typeof goalLevels)[number];
  @IsString() @Length(1, 160) title!: string;
  @IsOptional() @IsString() @MaxLength(2_000) reason?: string;
  @IsOptional() @IsString() @MaxLength(1_000) minimumViableVersion?: string;
  @IsOptional() @IsString() @MaxLength(1_000) fallbackPlan?: string;
  @IsOptional() @IsString() @MaxLength(1_000) recoveryRule?: string;
  @IsOptional() @IsDateString() targetDate?: string;
}

export class UpdateGoalDto {
  @IsInt() @Min(1) expectedVersion!: number;
  @IsOptional() @IsString() @Length(1, 160) title?: string;
  @IsOptional() @IsString() @MaxLength(2_000) reason?: string;
  @IsOptional() @IsIn(goalStatuses) status?: (typeof goalStatuses)[number];
  @IsOptional() @IsString() @MaxLength(1_000) minimumViableVersion?: string;
  @IsOptional() @IsString() @MaxLength(1_000) fallbackPlan?: string;
  @IsOptional() @IsString() @MaxLength(1_000) recoveryRule?: string;
}

@Injectable()
export class GoalService {
  constructor(private readonly db: DbService) {}

  async list(userId: string) {
    const result = await this.db.query<GoalRow>(`SELECT id, level, title, reason, status, minimum_viable_version AS "minimumViableVersion", fallback_plan AS "fallbackPlan", recovery_rule AS "recoveryRule", target_date AS "targetDate", version, created_at AS "createdAt", updated_at AS "updatedAt" FROM goal WHERE user_id=$1 AND status <> 'archived' ORDER BY created_at DESC`, [userId]);
    return result.rows;
  }

  async create(userId: string, input: CreateGoalDto, requestId?: string) {
    return this.db.transaction(async (client) => {
      const result = await client.query<GoalRow>(`INSERT INTO goal(user_id,level,title,reason,minimum_viable_version,fallback_plan,recovery_rule,target_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,level,title,reason,status,minimum_viable_version AS "minimumViableVersion",fallback_plan AS "fallbackPlan",recovery_rule AS "recoveryRule",target_date AS "targetDate",version,created_at AS "createdAt",updated_at AS "updatedAt"`, [userId, input.level, input.title.trim(), input.reason ?? null, input.minimumViableVersion ?? null, input.fallbackPlan ?? null, input.recoveryRule ?? null, input.targetDate ?? null]);
      const goal = result.rows[0]!;
      await client.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'create','goal',$2,$3)`, [userId, goal.id, requestId ?? null]);
      return goal;
    });
  }

  async update(userId: string, id: string, input: UpdateGoalDto, requestId?: string) {
    const values = [input.title, input.reason, input.status, input.minimumViableVersion, input.fallbackPlan, input.recoveryRule, userId, id, input.expectedVersion];
    const result = await this.db.query<GoalRow>(`UPDATE goal SET title=COALESCE($1,title),reason=COALESCE($2,reason),status=COALESCE($3,status),minimum_viable_version=COALESCE($4,minimum_viable_version),fallback_plan=COALESCE($5,fallback_plan),recovery_rule=COALESCE($6,recovery_rule),version=version+1,updated_at=now() WHERE user_id=$7 AND id=$8 AND version=$9 RETURNING id,level,title,reason,status,minimum_viable_version AS "minimumViableVersion",fallback_plan AS "fallbackPlan",recovery_rule AS "recoveryRule",target_date AS "targetDate",version,created_at AS "createdAt",updated_at AS "updatedAt"`, values);
    const goal = result.rows[0];
    if (!goal) {
      const exists = await this.db.query(`SELECT 1 FROM goal WHERE user_id=$1 AND id=$2`, [userId, id]);
      if (!exists.rowCount) throw new NotFoundException('Goal not found.');
      throw new ConflictException('This goal changed in another session. Refresh and try again.');
    }
    await this.db.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'update','goal',$2,$3)`, [userId, id, requestId ?? null]);
    return goal;
  }

  async archive(userId: string, id: string, requestId?: string): Promise<void> {
    const result = await this.db.query(`UPDATE goal SET status='archived',version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2 AND status <> 'archived'`, [userId, id]);
    if (!result.rowCount) throw new NotFoundException('Goal not found.');
    await this.db.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'archive','goal',$2,$3)`, [userId, id, requestId ?? null]);
  }
}

@ApiTags('goals') @ApiCookieAuth() @UseGuards(SessionGuard) @Controller('api/v1/goals')
export class GoalsController {
  constructor(private readonly goals: GoalService, private readonly policy: ResourcePolicyService) {}
  @Get() async list(@Req() request: FastifyRequest) { return { data: await this.goals.list(currentUser(request).id) }; }
  @Get('shared/:ownerId') async shared(@Param('ownerId', ParseUUIDPipe) ownerId: string, @Req() request: FastifyRequest) {
    if (!(await this.policy.canAccess(ownerId, currentUser(request).id, 'goal', 'view'))) throw new NotFoundException('Shared goals not found.');
    return { data: await this.goals.list(ownerId) };
  }
  @Post() @UseGuards(CsrfGuard) async create(@Body() input: CreateGoalDto, @Req() request: FastifyRequest) { return { data: await this.goals.create(currentUser(request).id, input, request.id) }; }
  @Patch(':id') @UseGuards(CsrfGuard) async update(@Param('id') id: string, @Body() input: UpdateGoalDto, @Req() request: FastifyRequest) { return { data: await this.goals.update(currentUser(request).id, id, input, request.id) }; }
  @Delete(':id') @UseGuards(CsrfGuard) @HttpCode(204) async archive(@Param('id') id: string, @Req() request: FastifyRequest) { await this.goals.archive(currentUser(request).id, id, request.id); }
}

export class ProfileDto {
  @IsOptional() @IsString() @Length(1, 80) displayName?: string;
  @IsOptional() @IsString() @Length(2, 15) locale?: string;
  @IsOptional() @IsTimeZone() timezone?: string;
  @IsOptional() @IsString() @MaxLength(80) lifeStage?: string;
  @IsOptional() @IsIn(['none', 'religious', 'spiritual', 'philosophical', 'custom', 'prefer_not_to_say']) worldview?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) accessibilityNeeds?: string[];
}

@ApiTags('profile') @ApiCookieAuth() @UseGuards(SessionGuard) @Controller('api/v1/profile')
export class ProfileController {
  constructor(private readonly db: DbService) {}
  @Get() async get(@Req() request: FastifyRequest) {
    const user = currentUser(request);
    const result = await this.db.query(`SELECT u.display_name AS "displayName",u.email,u.locale,u.timezone,p.life_stage AS "lifeStage",p.worldview,p.accessibility_needs AS "accessibilityNeeds" FROM app_user u LEFT JOIN profile p ON p.user_id=u.id WHERE u.id=$1`, [user.id]);
    return { data: result.rows[0] };
  }
  @Patch() @UseGuards(CsrfGuard) async update(@Body() input: ProfileDto, @Req() request: FastifyRequest) {
    const user = currentUser(request);
    return this.db.transaction(async (client) => {
      await client.query(`UPDATE app_user SET display_name=COALESCE($1,display_name),locale=COALESCE($2,locale),timezone=COALESCE($3,timezone),updated_at=now(),version=version+1 WHERE id=$4`, [input.displayName, input.locale, input.timezone, user.id]);
      await client.query(`INSERT INTO profile(user_id,life_stage,worldview,accessibility_needs) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id) DO UPDATE SET life_stage=COALESCE(EXCLUDED.life_stage,profile.life_stage),worldview=COALESCE(EXCLUDED.worldview,profile.worldview),accessibility_needs=CASE WHEN $5 THEN EXCLUDED.accessibility_needs ELSE profile.accessibility_needs END`, [user.id, input.lifeStage ?? null, input.worldview ?? null, JSON.stringify(input.accessibilityNeeds ?? []), input.accessibilityNeeds !== undefined]);
      await client.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'update','profile',$1,$2)`, [user.id, request.id]);
      return { data: { saved: true } };
    });
  }
}

class DataRequestDto { @IsIn(['export', 'deletion']) requestType!: 'export' | 'deletion'; }
class RequestIdDto { @IsUUID() id!: string; }

@ApiTags('privacy') @ApiCookieAuth() @UseGuards(SessionGuard) @Controller('api/v1/privacy')
export class PrivacyController {
  constructor(private readonly db: DbService) {}
  @Get('summary') async summary(@Req() request: FastifyRequest) {
    const userId = currentUser(request).id;
    const [goals, metrics, assessments, shares] = await Promise.all([
      this.db.query<{ count: string }>('SELECT count(*) FROM goal WHERE user_id=$1', [userId]),
      this.db.query<{ count: string }>('SELECT count(*) FROM metric_observation WHERE user_id=$1', [userId]),
      this.db.query<{ count: string }>('SELECT count(*) FROM wellbeing_assessment WHERE user_id=$1', [userId]),
      this.db.query<{ count: string }>('SELECT count(*) FROM sharing_permission WHERE owner_user_id=$1 AND revoked_at IS NULL', [userId]),
    ]);
    return { data: { goals: Number(goals.rows[0]!.count), metrics: Number(metrics.rows[0]!.count), assessments: Number(assessments.rows[0]!.count), activeShares: Number(shares.rows[0]!.count), privacyDefault: 'private' } };
  }
  @Get('requests') async requests(@Req() request: FastifyRequest) {
    const result = await this.db.query(`SELECT id,request_type AS "requestType",status,requested_at AS "requestedAt",available_at AS "availableAt",completed_at AS "completedAt",cancelled_at AS "cancelledAt",error_code AS "errorCode" FROM data_request WHERE user_id=$1 ORDER BY requested_at DESC`, [currentUser(request).id]);
    return { data: result.rows };
  }
  @Post('requests') @UseGuards(CsrfGuard) async create(@Body() input: DataRequestDto, @Req() request: FastifyRequest) {
    const userId = currentUser(request).id;
    try {
      const data = await this.db.transaction(async (client) => {
        const delay = input.requestType === 'deletion' ? "interval '7 days'" : "interval '0 seconds'";
        const result = await client.query<{ id: string; availableAt: string }>(`INSERT INTO data_request(user_id,request_type,available_at) VALUES ($1,$2,now()+${delay}) RETURNING id,available_at AS "availableAt"`, [userId, input.requestType]);
        const row = result.rows[0]!;
        if (input.requestType === 'deletion') await client.query(`UPDATE app_user SET status='pending_deletion',updated_at=now() WHERE id=$1`, [userId]);
        await client.query(`INSERT INTO job_outbox(job_type,actor_user_id,payload,available_at) VALUES ($1,$2,$3,$4)`, [`privacy.${input.requestType}`, userId, JSON.stringify({ requestId: row.id, userId }), row.availableAt]);
        await client.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,$2,'data_request',$3,$4)`, [userId, `request_${input.requestType}`, row.id, request.id]);
        return { id: row.id, requestType: input.requestType, status: 'pending', availableAt: row.availableAt };
      });
      return { data };
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException(`An open ${input.requestType} request already exists.`);
      throw error;
    }
  }
  @Delete('requests/:id') @UseGuards(CsrfGuard) @HttpCode(204) async cancel(@Param() params: RequestIdDto, @Req() request: FastifyRequest) {
    const userId = currentUser(request).id;
    const result = await this.db.transaction(async (client) => {
      const cancelled = await client.query(`UPDATE data_request SET status='cancelled',cancelled_at=now() WHERE id=$1 AND user_id=$2 AND request_type='deletion' AND status='pending' RETURNING id`, [params.id, userId]);
      if (!cancelled.rowCount) return false;
      await client.query(`UPDATE app_user SET status='active',updated_at=now() WHERE id=$1 AND status='pending_deletion'`, [userId]);
      await client.query(`UPDATE job_outbox SET status='completed',completed_at=now() WHERE payload->>'requestId'=$1 AND status IN ('pending','failed')`, [params.id]);
      await client.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'cancel_deletion','data_request',$2,$3)`, [userId, params.id, request.id]);
      return true;
    });
    if (!result) throw new NotFoundException('No cancellable deletion request was found.');
  }
  @Get('exports/:id') async download(@Param() params: RequestIdDto, @Req() request: FastifyRequest) {
    const result = await this.db.query<{ result: unknown; expiresAt: string }>(`SELECT result,result_expires_at AS "expiresAt" FROM data_request WHERE id=$1 AND user_id=$2 AND request_type='export' AND status='completed' AND result_expires_at > now()`, [params.id, currentUser(request).id]);
    if (!result.rows[0]) throw new NotFoundException('The export is not ready or has expired.');
    return { data: result.rows[0].result, meta: { expiresAt: result.rows[0].expiresAt } };
  }
}
