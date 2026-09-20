import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsISO8601, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { applicableStandards, evidenceRegistry, generatePlan, who5, type CapacityVector, type PlanItem, type PlanRequest } from '@be-human/domain';
import { AuthService, CredentialsDto, CsrfGuard, SessionGuard, currentUser } from './auth.js';
import { DbService } from './db.service.js';

class ApplicabilityDto {
  @ApiProperty({ minimum: 0, maximum: 130 }) @IsInt() @Min(0) @Max(130) age!: number;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() hasProfessionalRestriction?: boolean;
}

class CapacityDto implements CapacityVector {
  @IsNumber() @Min(0) temporal!: number;
  @IsNumber() @Min(0) physical!: number;
  @IsNumber() @Min(0) cognitive!: number;
  @IsNumber() @Min(0) emotional!: number;
  @IsNumber() @Min(0) social!: number;
  @IsNumber() @Min(0) executive!: number;
  @IsNumber() @Min(0) financial!: number;
  @IsNumber() @Min(0) environmental!: number;
}

class DemandDto implements Partial<CapacityVector> {
  @IsOptional() @IsNumber() @Min(0) temporal?: number;
  @IsOptional() @IsNumber() @Min(0) physical?: number;
  @IsOptional() @IsNumber() @Min(0) cognitive?: number;
  @IsOptional() @IsNumber() @Min(0) emotional?: number;
  @IsOptional() @IsNumber() @Min(0) social?: number;
  @IsOptional() @IsNumber() @Min(0) executive?: number;
  @IsOptional() @IsNumber() @Min(0) financial?: number;
  @IsOptional() @IsNumber() @Min(0) environmental?: number;
}

class PlanItemDto implements PlanItem {
  @IsString() id!: string;
  @IsString() title!: string;
  @IsInt() @Min(0) startMinute!: number;
  @IsInt() @Min(1) durationMinutes!: number;
  @IsBoolean() fixed!: boolean;
  @IsBoolean() essential!: boolean;
  @IsIn(['sleep', 'care', 'work', 'recovery', 'movement', 'personal', 'buffer']) category!: PlanItem['category'];
  @ValidateNested() @Type(() => DemandDto) demand!: DemandDto;
  @IsOptional() @IsArray() @IsString({ each: true }) accessibility?: string[];
  @IsOptional() @IsNumber() @Min(0) cost?: number;
}

class PlanRequestDto implements PlanRequest {
  @ApiProperty({ enum: ['stability', 'growth', 'recovery', 'survival'] }) @IsIn(['stability', 'growth', 'recovery', 'survival']) mode!: PlanRequest['mode'];
  @IsOptional() @IsInt() @Min(1) @Max(10_080) dayMinutes?: number;
  @ValidateNested() @Type(() => CapacityDto) available!: CapacityDto;
  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => PlanItemDto) items!: PlanItemDto[];
  @IsInt() @Min(0) @Max(1_440) minimumSleepMinutes!: number;
  @IsOptional() @IsNumber() @Min(0) budgetAvailable?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) accessibilityRequirements?: string[];
  @IsOptional() @IsObject() preferenceWeights?: PlanRequest['preferenceWeights'];
}

class SavePlanDto extends PlanRequestDto {
  @IsDateString() planDate!: string;
  @IsISO8601({ strict: true }) dayStart!: string;
  @IsString() timezone!: string;
}

class Who5Dto {
  @ApiProperty({ type: [Number], minItems: 5, maxItems: 5, minimum: 0, maximum: 5 })
  @IsArray() @ArrayMinSize(5) @ArrayMaxSize(5) @IsInt({ each: true }) @Min(0, { each: true }) @Max(5, { each: true }) items!: number[];
}

@ApiTags('system') @Controller()
export class HealthController {
  constructor(private readonly db: DbService) {}
  @Get('health') health() { return { status: 'ok', service: 'be-human-api', time: new Date().toISOString() }; }
  @Get('ready') async ready() { await this.db.query('SELECT 1'); return { status: 'ready' }; }
}

@ApiTags('auth') @Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private async establish(input: CredentialsDto, request: FastifyRequest, reply: FastifyReply, register = false) {
    const user = register ? await this.auth.register(input) : await this.auth.authenticate(input);
    const userAgent = request.headers['user-agent'];
    const { token, csrfToken } = await this.auth.createSession(user.id, { ...(userAgent ? { userAgent } : {}), ip: request.ip });
    const secure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production';
    reply.setCookie('bh_session', token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    reply.setCookie('bh_csrf', csrfToken, { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return { user };
  }
  @Post('register') @ApiOperation({ summary: 'Create an account and opaque browser session' }) register(@Body() input: CredentialsDto, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) { return this.establish(input, request, reply, true); }
  @Post('login') @HttpCode(200) @ApiOperation({ summary: 'Sign in without revealing account existence' }) login(@Body() input: CredentialsDto, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) { return this.establish(input, request, reply); }
  @Get('me') @UseGuards(SessionGuard) @ApiCookieAuth() me(@Req() request: FastifyRequest) { return { user: currentUser(request) }; }
  @Post('logout') @UseGuards(SessionGuard, CsrfGuard) @HttpCode(204) async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) { const token = request.cookies['bh_session']; if (token) await this.auth.revoke(token); reply.clearCookie('bh_session', { path: '/' }); reply.clearCookie('bh_csrf', { path: '/' }); }
}

@ApiTags('evidence') @Controller('api/v1/standards')
export class StandardsController {
  @Get() @ApiOperation({ summary: 'List the active, versioned evidence registry' }) list() { return { data: evidenceRegistry, meta: { total: evidenceRegistry.length } }; }
  @Post('applicability') @ApiOperation({ summary: 'Explain standard inclusion and exclusion' }) applicability(@Body() input: ApplicabilityDto) { return { data: applicableStandards(input) }; }
}

@ApiTags('planning') @Controller('api/v1/plans')
export class PlansController {
  constructor(private readonly db?: DbService) {}
  @Post('generate') @ApiOperation({ summary: 'Generate a constraint-respecting daily plan' }) @ApiResponse({ status: 201, description: 'A feasible plan or explicit conflict set.' }) generate(@Body() input: PlanRequestDto) { return { data: generatePlan(input), meta: { model: 'deterministic-v1', diagnostic: false } }; }
  @Post() @UseGuards(SessionGuard, CsrfGuard) @ApiCookieAuth() async save(@Body() input: SavePlanDto, @Req() request: FastifyRequest) {
    if (!this.db) throw new Error('Database service unavailable.');
    const user = currentUser(request);
    const result = generatePlan(input);
    const data = await this.db.transaction(async (client) => {
      const saved = await client.query<{ id: string }>(`INSERT INTO plan(user_id,plan_date,timezone,operating_mode,feasible,model_version,explanation) VALUES ($1,$2,$3,$4,$5,'deterministic-v1',$6) ON CONFLICT (user_id,plan_date,model_version) DO UPDATE SET timezone=EXCLUDED.timezone,operating_mode=EXCLUDED.operating_mode,feasible=EXCLUDED.feasible,explanation=EXCLUDED.explanation,created_at=now() RETURNING id`, [user.id, input.planDate, input.timezone, input.mode, result.feasible, JSON.stringify({ explanation: result.explanation, conflicts: result.conflicts, deferred: result.deferred.map((item) => item.id), demandCapacity: result.demandCapacity })]);
      const planId = saved.rows[0]!.id;
      await client.query('DELETE FROM plan_item WHERE plan_id=$1', [planId]);
      const dayStart = new Date(input.dayStart);
      for (const item of result.scheduled) {
        const startsAt = new Date(dayStart.getTime() + item.startMinute * 60_000);
        const endsAt = new Date(startsAt.getTime() + item.durationMinutes * 60_000);
        await client.query(`INSERT INTO plan_item(plan_id,title,starts_at,ends_at,fixed,essential,demand,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'planned')`, [planId, item.title, startsAt, endsAt, item.fixed, item.essential, JSON.stringify(item.demand)]);
      }
      await client.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,metadata,request_id) VALUES ($1,'save','plan',$2,$3,$4)`, [user.id, planId, JSON.stringify({ modelVersion: 'deterministic-v1', feasible: result.feasible }), request.id]);
      return { id: planId, ...result };
    });
    return { data, meta: { model: 'deterministic-v1', diagnostic: false } };
  }
}

@ApiTags('wellbeing') @Controller('api/v1/wellbeing')
export class WellbeingController {
  constructor(private readonly db: DbService) {}
  @Post('who5/score') @UseGuards(SessionGuard) @ApiCookieAuth() @ApiOperation({ summary: 'Score WHO-5 responses; never returns a diagnosis' }) score(@Body() input: Who5Dto) {
    return { data: who5(input.items), meta: { instrument: 'WHO-5', version: '2024.1', diagnostic: false, sourceId: 'who5-2024' } };
  }
  @Post('who5') @UseGuards(SessionGuard, CsrfGuard) @ApiCookieAuth() async record(@Body() input: Who5Dto, @Req() request: FastifyRequest) {
    const user = currentUser(request);
    const result = who5(input.items);
    const saved = await this.db.query<{ id: string }>(`INSERT INTO wellbeing_assessment(user_id,instrument_code,instrument_version,locale,administered_at,responses,raw_score,normalized_score) VALUES ($1,'WHO-5','2024.1','en',now(),$2,$3,$4) RETURNING id`, [user.id, JSON.stringify(input.items), result.raw, result.normalized]);
    await this.db.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,request_id) VALUES ($1,'record','wellbeing_assessment',$2,$3)`, [user.id, saved.rows[0]!.id, request.id]);
    return { data: { id: saved.rows[0]!.id, ...result }, meta: { instrument: 'WHO-5', version: '2024.1', diagnostic: false, sourceId: 'who5-2024' } };
  }
}

@ApiTags('today') @Controller('api/v1/today')
export class TodayController {
  constructor(private readonly db: DbService) {}
  @Get() @UseGuards(SessionGuard) @ApiCookieAuth() async get(@Req() request: FastifyRequest) {
    const user = currentUser(request);
    const profile = await this.db.query<{ timezone: string }>('SELECT timezone FROM app_user WHERE id=$1', [user.id]);
    const plan = await this.db.query(`SELECT p.id,p.plan_date AS "planDate",p.operating_mode AS mode,p.feasible,p.explanation,COALESCE(json_agg(json_build_object('id',i.id,'title',i.title,'startsAt',i.starts_at,'endsAt',i.ends_at,'fixed',i.fixed,'essential',i.essential,'status',i.status) ORDER BY i.starts_at) FILTER (WHERE i.id IS NOT NULL),'[]') AS items FROM plan p LEFT JOIN plan_item i ON i.plan_id=p.id WHERE p.user_id=$1 GROUP BY p.id ORDER BY p.plan_date DESC,p.created_at DESC LIMIT 1`, [user.id]);
    const goals = await this.db.query(`SELECT id,title,level,status FROM goal WHERE user_id=$1 AND status='active' ORDER BY created_at DESC LIMIT 5`, [user.id]);
    return { data: { greeting: `Good morning, ${user.displayName}`, timezone: profile.rows[0]?.timezone ?? 'UTC', plan: plan.rows[0] ?? null, goals: goals.rows, capacity: null, bufferMinutes: null, confidence: 'unknown' } };
  }
}
