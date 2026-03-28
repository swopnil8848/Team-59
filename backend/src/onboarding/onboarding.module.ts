import { Module } from "@nestjs/common";
import { ONBOARDING_REPOSITORY } from "../common/constants/injection-tokens";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingQuestionLoaderService } from "./onboarding-question-loader.service";
import { OnboardingRepository } from "./onboarding.repository";
import { OnboardingService } from "./onboarding.service";

@Module({
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    OnboardingRepository,
    OnboardingQuestionLoaderService,
    {
      provide: ONBOARDING_REPOSITORY,
      useExisting: OnboardingRepository
    }
  ],
  exports: [OnboardingService]
})
export class OnboardingModule {}
