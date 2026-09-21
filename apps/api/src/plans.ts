import {
  Body, Controller, Delete, Get, HttpCode, Injectable, NotFoundException, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { CsrfGuard, SessionGuard, currentUser } from './auth.js';
import { DbService } from './db.service.js';

const modes = ['stability', 'growth', 'recovery', 'survival'] as const;
const itemStatuses = ['planned', 'completed', 'skipped'] as const;
const categories = ['sleep', 'care', 'work', 'recovery', 'movement', 'personal', 'buffer', 'connection'] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

class WeekQueryDto {
  @IsOptional() @Matches(datePattern) start?: string;
}

class PlanIdDto {
  @IsUUID() id!: string;
}

class ItemIdDto {
  @IsUUID() id!: string;
}

class CreatePlanItemDto {
  @Matches(datePattern) planDate!: string;
  @IsString() @Length(1, 160) title!: string;
  @Matches(timePattern) startTime!: string;
  @IsInt() @Min(5) @Max(1_440) durationMinutes!: number;
  @IsOptional() @IsString() @Length(1, 500) detail?: string;
  @IsOptional() @IsIn(categories) category?: (typeof categories)[number];
  @IsOptional() @IsBoolean() fixed?: boolean;
  @IsOptional() @IsBoolean() essential?: boolean;
  @IsOptional() @IsIn(modes) mode?: (typeof modes)[number];
}

class UpdatePlanItemDto {
  @IsOptional() @IsString() @Length(1, 160) title?: string;
  @IsOptional() @Matches(timePattern) startTime?: string;
  @IsOptional() @IsInt() @Min(5) @Max(1_440) durationMinutes?: number;
  @IsOptional() @IsString() @Length(1, 500) detail?: string;
  @IsOptional() @IsIn(categories) category?: (typeof categories)[number];
  @IsOptional() @IsIn(itemStatuses) status?: (typeof itemStatuses)[number];
  @IsOptional() @IsBoolean() essential?: boolean;
}

class UpdatePlanModeDto {
  @IsIn(modes) mode!: (typeof modes)[number];
}

type PlanItemRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  fixed: boolean;
  essential: boolean;
  status: string;
  demand: Record<string, unknown>;
};

@Injectable()
export class DailyPlanService {
  constructor(private readonly db: DbService) {}

  async week(userId: string, start?: string) {
    const result = await this.db.query(`
      WITH latest AS (
        SELECT DISTINCT ON (plan_date) * FROM plan WHERE user_id=$1
          AND plan_date BETWEEN COALESCE($2::date,CURRENT_DATE) AND COALESCE($2::date,CURRENT_DATE)+6
        ORDER BY plan_date,created_at DESC
      )
      SELECT p.id,p.plan_date AS "planDate",p.timezone,p.operating_mode AS mode,p.feasible,p.explanation,
        COALESCE(json_agg(json_build_object(
          'id',i.id,'title',i.title,'startsAt',i.starts_at,'endsAt',i.ends_at,'fixed',i.fixed,
          'essential',i.essential,'status',i.status,'demand',i.demand
        ) ORDER BY i.starts_at) FILTER (WHERE i.id IS NOT NULL),'[]') AS items
      FROM latest p
      LEFT JOIN plan_item i ON i.plan_id=p.id
      GROUP BY p.id,p.plan_date,p.timezone,p.operating_mode,p.feasible,p.explanation
      ORDER BY p.plan_date
    `, [userId, start ?? null]);
    return result.rows;
  }

  async createItem(userId: string, input: CreatePlanItemDto, requestId?: string) {
    return this.db.transaction(async (client) => {
      const existing = await client.query<{ id: string }>(`
        SELECT id FROM plan WHERE user_id=$1 AND plan_date=$2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE
      `, [userId, input.planDate]);
      let planId = existing.rows[0]?.id;
      if (!planId) {
        const profile = await client.query<{ timezone: string }>('SELECT timezone FROM app_user WHERE id=$1', [userId]);
        const created = await client.query<{ id: string }>(`
          INSERT INTO plan(user_id,plan_date,timezone,operating_mode,feasible,model_version,explanation)
          VALUES ($1,$2,$3,$4,true,'manual-v1',$5) RETURNING id
        `, [userId, input.planDate, profile.rows[0]?.timezone ?? 'UTC', input.mode ?? 'stability', JSON.stringify({ source: 'manual', bufferMinutes: 0 })]);
        planId = created.rows[0]!.id;
      }
      const demand = JSON.stringify({ detail: input.detail ?? 'Added by you', category: input.category ?? 'personal', source: 'manual' });
      const item = await client.query<PlanItemRow>(`
        INSERT INTO plan_item(plan_id,title,starts_at,ends_at,fixed,essential,demand,status)
        SELECT p.id,$2,(p.plan_date+$3::time) AT TIME ZONE p.timezone,
          ((p.plan_date+$3::time) AT TIME ZONE p.timezone)+$4*interval '1 minute',$5,$6,$7,'planned'
        FROM plan p WHERE p.id=$1
        RETURNING id,title,starts_at AS "startsAt",ends_at AS "endsAt",fixed,essential,status,demand
      `, [planId, input.title.trim(), input.startTime, input.durationMinutes, input.fixed ?? false, input.essential ?? false, demand]);
      await client.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'create','plan_item',$2,$3)`, [userId, item.rows[0]!.id, requestId ?? null]);
      return item.rows[0]!;
    });
  }

  async updateItem(userId: string, id: string, input: UpdatePlanItemDto, requestId?: string) {
    const demandPatch: Record<string, string> = {};
    if (input.detail !== undefined) demandPatch.detail = input.detail;
    if (input.category !== undefined) demandPatch.category = input.category;
    const result = await this.db.query<PlanItemRow>(`
      UPDATE plan_item i SET
        title=COALESCE($1,i.title),
        starts_at=CASE WHEN $2::text IS NULL THEN i.starts_at ELSE (p.plan_date+$2::time) AT TIME ZONE p.timezone END,
        ends_at=(CASE WHEN $2::text IS NULL THEN i.starts_at ELSE (p.plan_date+$2::time) AT TIME ZONE p.timezone END)
          +COALESCE($3::numeric,EXTRACT(EPOCH FROM (i.ends_at-i.starts_at))/60)*interval '1 minute',
        status=COALESCE($4,i.status),essential=COALESCE($5,i.essential),demand=i.demand||$6::jsonb
      FROM plan p
      WHERE i.plan_id=p.id AND p.user_id=$7 AND i.id=$8
      RETURNING i.id,i.title,i.starts_at AS "startsAt",i.ends_at AS "endsAt",i.fixed,i.essential,i.status,i.demand
    `, [input.title?.trim() ?? null, input.startTime ?? null, input.durationMinutes ?? null, input.status ?? null, input.essential ?? null, JSON.stringify(demandPatch), userId, id]);
    const item = result.rows[0];
    if (!item) throw new NotFoundException('Plan item not found.');
    await this.db.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'update','plan_item',$2,$3)`, [userId, id, requestId ?? null]);
    return item;
  }

  async deleteItem(userId: string, id: string, requestId?: string): Promise<void> {
    const result = await this.db.query(`DELETE FROM plan_item i USING plan p WHERE i.plan_id=p.id AND p.user_id=$1 AND i.id=$2 RETURNING i.id`, [userId, id]);
    if (!result.rowCount) throw new NotFoundException('Plan item not found.');
    await this.db.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'delete','plan_item',$2,$3)`, [userId, id, requestId ?? null]);
  }

  async updateMode(userId: string, id: string, mode: (typeof modes)[number], requestId?: string) {
    const result = await this.db.query(`UPDATE plan SET operating_mode=$1,created_at=now() WHERE id=$2 AND user_id=$3 RETURNING id,operating_mode AS mode`, [mode, id, userId]);
    if (!result.rows[0]) throw new NotFoundException('Plan not found.');
    await this.db.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'update_mode','plan',$2,$3)`, [userId, id, requestId ?? null]);
    return result.rows[0];
  }
}

@ApiTags('planning') @ApiCookieAuth() @UseGuards(SessionGuard) @Controller('api/v1/plans')
export class DailyPlansController {
  constructor(private readonly plans: DailyPlanService) {}

  @Get('week') async week(@Query() query: WeekQueryDto, @Req() request: FastifyRequest) {
    return { data: await this.plans.week(currentUser(request).id, query.start) };
  }

  @Post('items') @UseGuards(CsrfGuard) async createItem(@Body() input: CreatePlanItemDto, @Req() request: FastifyRequest) {
    return { data: await this.plans.createItem(currentUser(request).id, input, request.id) };
  }

  @Patch('items/:id') @UseGuards(CsrfGuard) async updateItem(@Param() params: ItemIdDto, @Body() input: UpdatePlanItemDto, @Req() request: FastifyRequest) {
    return { data: await this.plans.updateItem(currentUser(request).id, params.id, input, request.id) };
  }

  @Delete('items/:id') @UseGuards(CsrfGuard) @HttpCode(204) async deleteItem(@Param() params: ItemIdDto, @Req() request: FastifyRequest) {
    await this.plans.deleteItem(currentUser(request).id, params.id, request.id);
  }

  @Patch(':id/mode') @UseGuards(CsrfGuard) async updateMode(@Param() params: PlanIdDto, @Body() input: UpdatePlanModeDto, @Req() request: FastifyRequest) {
    return { data: await this.plans.updateMode(currentUser(request).id, params.id, input.mode, request.id) };
  }
}
