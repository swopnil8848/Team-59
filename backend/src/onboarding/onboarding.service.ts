import {
  BadRequestException,
  Inject,
  Injectable
} from "@nestjs/common";
import { OnboardingQuestionType, OnboardingResponseStatus, Prisma } from "@prisma/client";
import { ONBOARDING_REPOSITORY } from "../common/constants/injection-tokens";
import {
  CreateOnboardingResponseDto,
  UpsertOnboardingAnswerDto
} from "./dto/create-onboarding-response.dto";
import {
  OnboardingQuestionsPayloadDto,
  OnboardingResponseDto
} from "./dto/onboarding-response.dto";
import { UpdateOnboardingResponseDto } from "./dto/update-onboarding-response.dto";
import { IOnboardingRepository } from "./interfaces/onboarding-repository.interface";
import { toOnboardingResponseDto, toQuestionsPayload } from "./onboarding.mapper";
import { OnboardingQuestionLoaderService } from "./onboarding-question-loader.service";

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(ONBOARDING_REPOSITORY)
    private readonly onboardingRepository: IOnboardingRepository,
    private readonly onboardingQuestionLoaderService: OnboardingQuestionLoaderService
  ) {}

  async getQuestions(): Promise<OnboardingQuestionsPayloadDto> {
    const questionFile = this.onboardingQuestionLoaderService.getQuestionsFile();
    const questions = await this.onboardingRepository.listActiveQuestions();

    return toQuestionsPayload(questionFile, questions);
  }

  async getCurrentResponse(userId: string): Promise<OnboardingResponseDto | null> {
    const response = await this.onboardingRepository.findResponseByUserId(userId);
    return response ? toOnboardingResponseDto(response) : null;
  }

  async createResponse(
    userId: string,
    dto: CreateOnboardingResponseDto
  ): Promise<OnboardingResponseDto> {
    const existingResponse = await this.onboardingRepository.findResponseByUserId(userId);

    if (existingResponse) {
      throw new BadRequestException("Onboarding response already exists for this user");
    }

    const response = await this.onboardingRepository.createResponse({
      userId,
      status: dto.status as OnboardingResponseStatus | undefined,
      currentPageNo: dto.currentPageNo
    });

    await this.persistAnswers(response.id, dto.answers);

    const savedResponse = await this.onboardingRepository.findResponseByUserId(userId);
    if (!savedResponse) {
      throw new BadRequestException("Failed to load saved onboarding response");
    }

    return toOnboardingResponseDto(savedResponse);
  }

  async updateResponse(
    userId: string,
    dto: UpdateOnboardingResponseDto
  ): Promise<OnboardingResponseDto> {
    const existingResponse = await this.onboardingRepository.findResponseByUserId(userId);

    if (!existingResponse) {
      throw new BadRequestException("Onboarding response does not exist for this user");
    }

    await this.onboardingRepository.updateResponse(existingResponse.id, {
      status: dto.status as OnboardingResponseStatus | undefined,
      currentPageNo: dto.currentPageNo
    });

    if (dto.answers?.length) {
      await this.persistAnswers(existingResponse.id, dto.answers);
    }

    const savedResponse = await this.onboardingRepository.findResponseByUserId(userId);
    if (!savedResponse) {
      throw new BadRequestException("Failed to load updated onboarding response");
    }

    return toOnboardingResponseDto(savedResponse);
  }

  private async persistAnswers(
    responseId: string,
    answers: UpsertOnboardingAnswerDto[]
  ): Promise<void> {
    for (const answer of answers) {
      const question = await this.onboardingRepository.findQuestionByKey(answer.questionKey);

      if (!question || !question.isActive) {
        throw new BadRequestException(`Unknown onboarding question: ${answer.questionKey}`);
      }

      const valueRecord = this.normalizeAnswerValue(question.type, question.options, answer.value);

      await this.onboardingRepository.upsertAnswer({
        responseId,
        questionId: question.id,
        ...valueRecord
      });
    }
  }

  private normalizeAnswerValue(
    type: OnboardingQuestionType,
    options: Prisma.JsonValue | null,
    rawValue: unknown
  ) {
    switch (type) {
      case OnboardingQuestionType.TEXT:
      case OnboardingQuestionType.TEXTAREA:
        if (typeof rawValue !== "string") {
          throw new BadRequestException("Answer must be a string");
        }
        return {
          valueText: rawValue
        };

      case OnboardingQuestionType.NUMBER:
        if (typeof rawValue !== "number") {
          throw new BadRequestException("Answer must be a number");
        }
        return {
          valueNumber: rawValue
        };

      case OnboardingQuestionType.BOOLEAN:
        if (typeof rawValue !== "boolean") {
          throw new BadRequestException("Answer must be a boolean");
        }
        return {
          valueBoolean: rawValue
        };

      case OnboardingQuestionType.SINGLE_SELECT:
        if (typeof rawValue !== "string") {
          throw new BadRequestException("Single select answer must be a string");
        }
        this.ensureOptionValue(options, rawValue);
        return {
          valueText: rawValue
        };

      case OnboardingQuestionType.MULTI_SELECT:
        if (!Array.isArray(rawValue) || !rawValue.every((item) => typeof item === "string")) {
          throw new BadRequestException("Multi select answer must be an array of strings");
        }
        rawValue.forEach((item) => this.ensureOptionValue(options, item));
        return {
          valueJson: rawValue as Prisma.InputJsonValue
        };

      default:
        throw new BadRequestException("Unsupported onboarding question type");
    }
  }

  private ensureOptionValue(options: Prisma.JsonValue | null, rawValue: string) {
    const parsedOptions = (options ?? []) as Array<{ label: string; value: string }>;
    const isAllowedValue = parsedOptions.some((option) => option.value === rawValue);

    if (!isAllowedValue) {
      throw new BadRequestException(`Invalid option selected: ${rawValue}`);
    }
  }
}
