import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { OidcService } from './oidc.service.js';
import { TenantService } from './tenant.service.js';
import { SessionGuard } from './session.guard.js';

@Module({
  controllers: [AuthController],
  providers: [OidcService, TenantService, SessionGuard],
  exports: [SessionGuard],
})
export class AuthModule {}
