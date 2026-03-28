import { OnboardingResponseStatusEnum } from "../../common/enums/onboarding-response-status.enum";
import { BaseQuestionOptionDto } from "./base-question-option.dto";

export class OnboardingOptionDto extends BaseQuestionOptionDto {}

export class OnboardingQuestionDto {
  id!: string;
  key!: string;
  pageNo!: number;
  order!: number;
  type!: string;
  question!: string;
  description!: string | null;
  placeholder!: string | null;
  required!: boolean;
  options!: OnboardingOptionDto[] | null;
}

export class OnboardingPageDto {
  pageNo!: number;
  title!: string;
  description?: string;
}

export class OnboardingQuestionsPayloadDto {
  version!: string;
  title!: string;
  description!: string;
  pages!: OnboardingPageDto[];
  questions!: OnboardingQuestionDto[];
}

export class OnboardingAnswerDto {
  questionKey!: string;
  value!: unknown;
}

export class OnboardingResponseDto {
  id!: string;
  status!: OnboardingResponseStatusEnum;
  currentPageNo!: number | null;
  answers!: OnboardingAnswerDto[];
  updatedAt!: Date;
}
