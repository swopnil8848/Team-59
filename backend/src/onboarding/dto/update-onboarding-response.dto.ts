import { PartialType } from "@nestjs/mapped-types";
import { CreateOnboardingResponseDto } from "./create-onboarding-response.dto";

export class UpdateOnboardingResponseDto extends PartialType(CreateOnboardingResponseDto) {}
