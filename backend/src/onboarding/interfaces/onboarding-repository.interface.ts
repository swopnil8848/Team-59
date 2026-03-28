import {
  OnboardingQuestion,
  OnboardingResponse,
  Prisma
} from "@prisma/client";

export type OnboardingResponseWithAnswers = Prisma.OnboardingResponseGetPayload<{
  include: {
    answers: {
      include: {
        question: true;
      };
    };
  };
}>;

export interface IOnboardingRepository {
  listActiveQuestions(): Promise<OnboardingQuestion[]>;
  findQuestionByKey(key: string): Promise<OnboardingQuestion | null>;
  upsertQuestion(data: Prisma.OnboardingQuestionUncheckedCreateInput): Promise<OnboardingQuestion>;
  findResponseByUserId(userId: string): Promise<OnboardingResponseWithAnswers | null>;
  createResponse(input: {
    userId: string;
    status?: OnboardingResponse["status"];
    currentPageNo?: number;
  }): Promise<OnboardingResponse>;
  updateResponse(
    responseId: string,
    input: { status?: OnboardingResponse["status"]; currentPageNo?: number }
  ): Promise<OnboardingResponse>;
  upsertAnswer(input: {
    responseId: string;
    questionId: string;
    valueText?: string | null;
    valueNumber?: number | null;
    valueBoolean?: boolean | null;
    valueJson?: Prisma.InputJsonValue | null;
  }): Promise<void>;
}
