import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";
import { OnboardingResponseStatusEnum } from "../../common/enums/onboarding-response-status.enum";

export class UpsertOnboardingAnswerDto {
  @IsString()
  questionKey!: string;

  @IsDefined()
  value!: unknown;
}

export class CreateOnboardingResponseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currentPageNo?: number;

  @IsOptional()
  @IsEnum(OnboardingResponseStatusEnum)
  status?: OnboardingResponseStatusEnum;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertOnboardingAnswerDto)
  answers!: UpsertOnboardingAnswerDto[];
}
