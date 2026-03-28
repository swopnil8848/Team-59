import {
  OnboardingQuestionsPayloadDto,
  OnboardingResponseDto
} from "./onboarding-response.dto";

export class GetOnboardingQuestionsResponseDto extends OnboardingQuestionsPayloadDto {}

export class GetCurrentOnboardingResponseDto {
  response!: OnboardingResponseDto | null;
}

export class SaveOnboardingResponseDto {
  response!: OnboardingResponseDto;
}
