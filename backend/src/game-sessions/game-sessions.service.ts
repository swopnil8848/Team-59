import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, GameQuestion, GameQuestionAnswer, GameSession } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AnswerGameQuestionDto } from "./dto/answer-game-question.dto";
import { CreateGameSessionDto } from "./dto/create-game-session.dto";
import {
  AnswerGameQuestionResponseDto,
  CreateGameSessionResponseDto,
  GameQuestionDto,
  GameSessionSummaryDto,
  GetGameSessionResponseDto
} from "./dto/game-session-response.dto";
import { GameQuestionStatusEnum } from "./enums/game-question-status.enum";
import { GameSessionStatusEnum } from "./enums/game-session-status.enum";

type GameQuestionWithAnswers = GameQuestion & {
  answers: GameQuestionAnswer[];
};

type GameSessionWithQuestions = GameSession & {
  questions: GameQuestionWithAnswers[];
};

@Injectable()
export class GameSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    userId: string,
    dto: CreateGameSessionDto
  ): Promise<CreateGameSessionResponseDto> {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId }
    })) as {
      id: string;
      email: string;
      gender: string | null;
      age: number | null;
      environment: string | null;
    } | null;

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const resolvedUserProfile = {
      gender: dto.gender ?? user.gender,
      age: dto.age ?? user.age,
      environment: dto.environment ?? user.environment
    };

    if (!resolvedUserProfile.gender || !resolvedUserProfile.age || !resolvedUserProfile.environment) {
      throw new BadRequestException(
        "gender, age, and environment are required to start a game session"
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: resolvedUserProfile
    });

    const questionCount = dto.questionCount ?? 3;

    const generationContext = this.buildGenerationContext({
      gender: resolvedUserProfile.gender,
      age: resolvedUserProfile.age,
      environment: resolvedUserProfile.environment
    });

    const session = await this.prisma.gameSession.create({
      data: {
        userId,
        status: GameSessionStatusEnum.CREATED,
        generationContext
      }
    });

    const generatedQuestions = this.generateQuestions(generationContext, questionCount);

    const savedSession = await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        status: GameSessionStatusEnum.IN_PROGRESS,
        totalQuestions: generatedQuestions.length,
        questions: {
          create: generatedQuestions.map((question, index) => ({
            order: index + 1,
            questionText: question.questionText,
            status: GameQuestionStatusEnum.PENDING,
            explanation: question.explanation,
            answers: {
              create: question.answers.map((answerText) => ({
                answerText
              }))
            }
          }))
        }
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            answers: {
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });

    return {
      session: this.toGameSessionSummaryDto(savedSession),
      questions: savedSession.questions.map((question) => this.toGameQuestionDto(question))
    };
  }

  async getSession(userId: string, sessionId: string): Promise<GetGameSessionResponseDto> {
    const session = await this.prisma.gameSession.findFirst({
      where: {
        id: sessionId,
        userId
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            answers: {
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException("Game session not found");
    }

    const currentQuestion =
      session.questions.find(
        (question) => question.status !== GameQuestionStatusEnum.ANSWERED
      ) ?? null;

    return {
      session: this.toGameSessionSummaryDto(session),
      currentQuestion: currentQuestion ? this.toGameQuestionDto(currentQuestion) : null
    };
  }

  async answerQuestion(
    userId: string,
    sessionId: string,
    questionId: string,
    dto: AnswerGameQuestionDto
  ): Promise<AnswerGameQuestionResponseDto> {
    const session = await this.prisma.gameSession.findFirst({
      where: {
        id: sessionId,
        userId
      }
    });

    if (!session) {
      throw new NotFoundException("Game session not found");
    }

    const question = await this.prisma.gameQuestion.findFirst({
      where: {
        id: questionId,
        sessionId
      },
      include: {
        answers: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!question) {
      throw new NotFoundException("Question not found for this session");
    }

    const selectedAnswer = question.answers.find((answer) => answer.id === dto.selectedAnswerId);

    if (!selectedAnswer) {
      throw new BadRequestException("Selected answer does not belong to this question");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.gameUserResponse.upsert({
        where: {
          questionId
        },
        update: {
          sessionId,
          selectedAnswerId: dto.selectedAnswerId,
          answeredAt: new Date(),
          responseTimeMs: dto.responseTimeMs
        },
        create: {
          sessionId,
          questionId,
          selectedAnswerId: dto.selectedAnswerId,
          answeredAt: new Date(),
          responseTimeMs: dto.responseTimeMs
        }
      });

      await tx.gameQuestion.update({
        where: {
          id: questionId
        },
        data: {
          status: GameQuestionStatusEnum.ANSWERED,
          isSolvedByUser: true
        }
      });

      const answeredCount = await tx.gameUserResponse.count({
        where: {
          sessionId
        }
      });

      const isCompleted = answeredCount >= session.totalQuestions && session.totalQuestions > 0;

      await tx.gameSession.update({
        where: {
          id: sessionId
        },
        data: {
          lastQuestionIndex: answeredCount,
          status: isCompleted
            ? GameSessionStatusEnum.COMPLETED
            : GameSessionStatusEnum.IN_PROGRESS,
          completedAt: isCompleted ? new Date() : null
        }
      });
    });

    const updatedSession = await this.prisma.gameSession.findUnique({
      where: {
        id: sessionId
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            answers: {
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });

    if (!updatedSession) {
      throw new NotFoundException("Updated game session not found");
    }

    const nextQuestion =
      updatedSession.questions.find(
        (currentQuestion) => currentQuestion.status !== GameQuestionStatusEnum.ANSWERED
      ) ?? null;

    return {
      saved: true,
      session: this.toGameSessionSummaryDto(updatedSession),
      isCompleted: updatedSession.status === GameSessionStatusEnum.COMPLETED,
      nextQuestion: nextQuestion ? this.toGameQuestionDto(nextQuestion) : null
    };
  }

  private buildGenerationContext(input: {
    gender: string;
    age: number;
    environment: string;
  }) {
    return {
      gender: input.gender,
      age: input.age,
      environment: input.environment
    } satisfies Prisma.InputJsonValue;
  }

  private generateQuestions(context: Prisma.InputJsonValue, questionCount: number) {
    const payload = context as {
      gender?: string;
      age?: number;
      environment?: string;
    };

    const environmentLabel = payload.environment ?? "daily life";
    const ageLabel = typeof payload.age === "number" ? `${payload.age}-year-old` : "person";
    const genderLabel = payload.gender ?? "person";

    const baseQuestions = [
      {
        questionText: `As a ${ageLabel} navigating a ${environmentLabel} setting, when you start feeling overwhelmed, what kind of support would feel most helpful right now?`,
        explanation: "This explores what kind of coping support feels realistic in the moment.",
        answers: [
          "Pause for a few minutes, breathe, and check in with how I feel.",
          "Keep pushing and ignore how I feel until the day ends.",
          "Avoid everyone and bottle everything up.",
          "Assume the stress will disappear if I do nothing."
        ]
      },
      {
        questionText:
          `A ${genderLabel} user reports feeling mentally drained for several days. Which response sounds closest to what they would realistically choose next?`,
        explanation: "This helps identify your current response pattern when energy is low.",
        answers: [
          "Talk to someone I trust or ask for support.",
          "Take one small step and give myself permission not to solve everything today.",
          "Pretend everything is fine and continue as usual.",
          "Withdraw completely without telling anyone how I am doing."
        ]
      },
      {
        questionText:
          `In a ${environmentLabel} environment, when a difficult situation keeps replaying in your mind, what support would help most?`,
        explanation: "This question surfaces whether the user leans toward reflection, support, or avoidance.",
        answers: [
          "Space to slow down and process my thoughts calmly.",
          "A trusted person who can listen without judging me.",
          "A practical step-by-step way to regain control.",
          "A distraction so I do not have to think about it at all."
        ]
      },
      {
        questionText:
          "You are worried about an upcoming responsibility and keep postponing it. What approach feels most manageable for you right now?",
        explanation: "This helps gauge coping style around anxiety and avoidance.",
        answers: [
          "Break it into one tiny step and start there.",
          "Wait until the pressure becomes unavoidable.",
          "Judge myself harshly for falling behind.",
          "Distract myself and hope the stress passes."
        ]
      }
    ];

    return baseQuestions.slice(0, questionCount);
  }

  private toGameSessionSummaryDto(session: GameSession): GameSessionSummaryDto {
    return {
      id: session.id,
      status: session.status as GameSessionStatusEnum,
      lastQuestionIndex: session.lastQuestionIndex,
      totalQuestions: session.totalQuestions,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      feedback: session.feedback
    };
  }

  private toGameQuestionDto(question: GameQuestionWithAnswers): GameQuestionDto {
    return {
      id: question.id,
      order: question.order,
      questionText: question.questionText,
      status: question.status as GameQuestionStatusEnum,
      explanation: question.explanation,
      answers: question.answers.map((answer) => ({
        id: answer.id,
        answerText: answer.answerText
      }))
    };
  }
}
