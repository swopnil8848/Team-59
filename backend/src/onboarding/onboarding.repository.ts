import { Injectable } from "@nestjs/common";
import { OnboardingResponse, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  IOnboardingRepository,
  OnboardingResponseWithAnswers
} from "./interfaces/onboarding-repository.interface";

@Injectable()
export class OnboardingRepository implements IOnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveQuestions() {
    return this.prisma.onboardingQuestion.findMany({
      where: { isActive: true },
      orderBy: [{ pageNo: "asc" }, { order: "asc" }]
    });
  }

  async findQuestionByKey(key: string) {
    return this.prisma.onboardingQuestion.findUnique({ where: { key } });
  }

  async upsertQuestion(data: Prisma.OnboardingQuestionUncheckedCreateInput) {
    return this.prisma.onboardingQuestion.upsert({
      where: { key: data.key },
      create: data,
      update: {
        pageNo: data.pageNo,
        order: data.order,
        type: data.type,
        question: data.question,
        description: data.description,
        placeholder: data.placeholder,
        required: data.required,
        options: data.options,
        isActive: data.isActive
      }
    });
  }

  async findResponseByUserId(userId: string): Promise<OnboardingResponseWithAnswers | null> {
    return this.prisma.onboardingResponse.findUnique({
      where: { userId },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      }
    });
  }

  async createResponse(input: {
    userId: string;
    status?: OnboardingResponse["status"];
    currentPageNo?: number;
  }) {
    return this.prisma.onboardingResponse.create({
      data: {
        userId: input.userId,
        status: input.status,
        currentPageNo: input.currentPageNo
      }
    });
  }

  async updateResponse(
    responseId: string,
    input: { status?: OnboardingResponse["status"]; currentPageNo?: number }
  ) {
    return this.prisma.onboardingResponse.update({
      where: { id: responseId },
      data: {
        status: input.status,
        currentPageNo: input.currentPageNo
      }
    });
  }

  async upsertAnswer(input: {
    responseId: string;
    questionId: string;
    valueText?: string | null;
    valueNumber?: number | null;
    valueBoolean?: boolean | null;
    valueJson?: Prisma.InputJsonValue | null;
  }) {
    await this.prisma.onboardingAnswer.upsert({
      where: {
        responseId_questionId: {
          responseId: input.responseId,
          questionId: input.questionId
        }
      },
      create: {
        responseId: input.responseId,
        questionId: input.questionId,
        valueText: input.valueText ?? null,
        valueNumber: input.valueNumber ?? null,
        valueBoolean: input.valueBoolean ?? null,
        valueJson: input.valueJson ?? Prisma.JsonNull
      },
      update: {
        valueText: input.valueText ?? null,
        valueNumber: input.valueNumber ?? null,
        valueBoolean: input.valueBoolean ?? null,
        valueJson: input.valueJson ?? Prisma.JsonNull
      }
    });
  }
}
