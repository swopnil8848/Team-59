import { OnboardingQuestion, Prisma } from "@prisma/client";
import { OnboardingResponseStatusEnum } from "../common/enums/onboarding-response-status.enum";
import {
  OnboardingQuestionsPayloadDto,
  OnboardingResponseDto
} from "./dto/onboarding-response.dto";
import {
  OnboardingPageDefinition,
  OnboardingQuestionFile
} from "./interfaces/onboarding-question-file.interface";
import { OnboardingResponseWithAnswers } from "./interfaces/onboarding-repository.interface";

function parseOptions(options: Prisma.JsonValue | null) {
  return options ? (options as Array<{ label: string; value: string }>) : null;
}

export function toQuestionsPayload(
  file: OnboardingQuestionFile,
  questions: OnboardingQuestion[]
): OnboardingQuestionsPayloadDto {
  const questionByKey = new Map(questions.map((question) => [question.key, question]));

  return {
    version: file.version,
    title: file.title,
    description: file.description,
    pages: file.pages.map((page: OnboardingPageDefinition) => ({
      pageNo: page.pageNo,
      title: page.title,
      description: page.description
    })),
    questions: file.questions
      .map((question) => questionByKey.get(question.key))
      .filter((question): question is OnboardingQuestion => Boolean(question))
      .sort((left, right) => left.pageNo - right.pageNo || left.order - right.order)
      .map((question) => ({
        id: question.id,
        key: question.key,
        pageNo: question.pageNo,
        order: question.order,
        type: question.type,
        question: question.question,
        description: question.description,
        placeholder: question.placeholder,
        required: question.required,
        options: parseOptions(question.options)
      }))
  };
}

function resolveAnswerValue(
  answer: OnboardingResponseWithAnswers["answers"][number]
): unknown {
  if (answer.valueBoolean !== null) {
    return answer.valueBoolean;
  }

  if (answer.valueNumber !== null) {
    return answer.valueNumber;
  }

  if (answer.valueJson !== null) {
    return answer.valueJson;
  }

  return answer.valueText;
}

export function toOnboardingResponseDto(
  response: OnboardingResponseWithAnswers
): OnboardingResponseDto {
  return {
    id: response.id,
    status: response.status as unknown as OnboardingResponseStatusEnum,
    currentPageNo: response.currentPageNo,
    updatedAt: response.updatedAt,
    answers: response.answers
      .sort((left, right) => left.question.order - right.question.order)
      .map((answer) => ({
        questionKey: answer.question.key,
        value: resolveAnswerValue(answer)
      }))
  };
}
