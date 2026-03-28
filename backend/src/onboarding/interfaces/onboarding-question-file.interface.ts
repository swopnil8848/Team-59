import { OnboardingQuestionTypeEnum } from "../../common/enums/onboarding-question-type.enum";

export interface OnboardingQuestionOption {
  label: string;
  value: string;
}

export interface OnboardingPageDefinition {
  pageNo: number;
  title: string;
  description?: string;
}

export interface OnboardingQuestionDefinition {
  key: string;
  pageNo: number;
  order: number;
  type: OnboardingQuestionTypeEnum;
  question: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: OnboardingQuestionOption[];
}

export interface OnboardingQuestionFile {
  version: string;
  title: string;
  description: string;
  pages: OnboardingPageDefinition[];
  questions: OnboardingQuestionDefinition[];
}
