import { Module } from '@nestjs/common';
import { AuthService, CsrfGuard, SessionGuard } from './auth.js';
import { AuthController, HealthController, PlansController, StandardsController, TodayController, WellbeingController } from './controllers.js';
import { DbService } from './db.service.js';
import { GoalService, GoalsController, PrivacyController, ProfileController } from './resources.js';
import { HouseholdsController, ResourcePolicyService } from './households.js';

@Module({
  controllers: [HealthController, AuthController, StandardsController, PlansController, WellbeingController, TodayController, GoalsController, ProfileController, PrivacyController, HouseholdsController],
  providers: [DbService, AuthService, SessionGuard, CsrfGuard, GoalService, ResourcePolicyService],
})
export class AppModule {}
