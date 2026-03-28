import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import appConfig from "./config/app.config";
import { validateEnv } from "./config/env.validation";
import { OnboardingModule } from "./onboarding/onboarding.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OnboardingModule
  ]
})
export class AppModule {}
