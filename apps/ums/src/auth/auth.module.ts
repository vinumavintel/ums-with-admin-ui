import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { AppsModule } from '../apps/apps.module';

@Module({
  imports: [
    // sets 'jwt' as the default passport strategy
  PassportModule.register({ defaultStrategy: 'jwt' }),
  // Needed so RolesGuard (provided here) can inject AppsService
  AppsModule,
  ],
  providers: [JwtStrategy, RolesGuard],
  exports: [PassportModule, RolesGuard],
})
export class AuthModule {}
