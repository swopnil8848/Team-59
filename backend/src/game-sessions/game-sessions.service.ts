import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, GameQuestion, GameQuestionAnswer, GameSession } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { QuestionGenerationService } from "../question-prefetch/question-generation.service";
import { QuestionPrefetchService } from "../question-prefetch/question-prefetch.service";
import { AnswerGameQuestionDto } from "./dto/answer-game-question.dto";
import {
  AnswerGameQuestionResponseDto,
  CreateGameSessionResponseDto,
  GameQuestionDto,
  GameSessionSummaryDto,
  GetGameSessionResponseDto
} from "./dto/game-session-response.dto";
import { GameQuestionStatusEnum } from "./enums/game-question-status.enum";
import { GameSessionStatusEnum } from "./enums/game-session-status.enum";
import {
  EligibleUserQuestionProfile,
  GeneratedQuestionPayload,
  GeneratedQuestionSet
} from "../question-prefetch/interfaces/generated-question-set.interface";

type GameQuestionWithAnswers = GameQuestion & {
  outsider: boolean;
  answers: Array<
    GameQuestionAnswer & {
      isCorrect: boolean;
      feedback: string | null;
    }
  >;
};

@Injectable()
export class GameSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionGenerationService: QuestionGenerationService,
    private readonly questionPrefetchService: QuestionPrefetchService
  ) {}

  async createSession(userId: string): Promise<CreateGameSessionResponseDto> {
    const userProfile = await this.getEligibleUserProfile(userId);
    const prefetchedQuestionSet =
      await this.questionPrefetchService.consumePrefetchedQuestions(userId);
    const generatedQuestionSet =
      prefetchedQuestionSet ??
      (await this.questionGenerationService.generateQuestionsForProfile(userProfile));

    const savedSession = await this.createDbSessionFromQuestionSet(
      userId,
      userProfile,
      generatedQuestionSet
    );

    if (prefetchedQuestionSet) {
      await this.questionPrefetchService.deletePrefetchedQuestions(userId);
    }

    await this.questionPrefetchService.enqueueQuestionPrefetch(userId);

    return {
      session: this.toGameSessionSummaryDto(savedSession),
      questions: savedSession.questions.map((question) =>
        this.toGameQuestionDto(question as GameQuestionWithAnswers)
      )
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
      currentQuestion: currentQuestion
        ? this.toGameQuestionDto(currentQuestion as GameQuestionWithAnswers)
        : null
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

    await this.questionPrefetchService.enqueueQuestionPrefetch(userId);

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
      selectedAnswer: {
        id: selectedAnswer.id,
        answerText: selectedAnswer.answerText,
        isCorrect: (selectedAnswer as GameQuestionWithAnswers["answers"][number]).isCorrect,
        feedback:
          (selectedAnswer as GameQuestionWithAnswers["answers"][number]).feedback ?? null
      },
      nextQuestion: nextQuestion
        ? this.toGameQuestionDto(nextQuestion as GameQuestionWithAnswers)
        : null
    };
  }

  private async getEligibleUserProfile(
    userId: string
  ): Promise<Omit<EligibleUserQuestionProfile, "id">> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        gender: true,
        age: true,
        environment: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.gender || !user.age || !user.environment) {
      throw new BadRequestException(
        "gender, age, and environment are required to start a game session"
      );
    }

    return {
      gender: user.gender,
      age: user.age,
      environment: user.environment
    };
  }

  private async createDbSessionFromQuestionSet(
    userId: string,
    userProfile: Omit<EligibleUserQuestionProfile, "id">,
    generatedQuestionSet: GeneratedQuestionSet
  ) {
    const generationContext = this.questionGenerationService.buildGenerationContext({
      ...userProfile
    });

    return this.prisma.gameSession.create({
      data: {
        userId,
        status: GameSessionStatusEnum.IN_PROGRESS,
        generationContext: {
          ...(generationContext as Record<string, string | number>),
          questionSetId: generatedQuestionSet.questionSetId
        } satisfies Prisma.InputJsonValue,
        totalQuestions: generatedQuestionSet.questions.length,
        questions: {
          create: generatedQuestionSet.questions.map((question: GeneratedQuestionPayload) => ({
            order: question.order,
            outsider: question.outsider,
            questionText: question.questionText,
            status: GameQuestionStatusEnum.PENDING,
            explanation: question.explanation,
            answers: {
              create: question.answers.map((answer) => ({
                answerText: answer.text,
                isCorrect: answer.correct,
                feedback: answer.feedback
              }))
            }
          })) as any
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
      outsider: question.outsider,
      questionText: question.questionText,
      status: question.status as GameQuestionStatusEnum,
      explanation: question.explanation,
      answers: question.answers.map((answer) => ({
        id: answer.id,
        answerText: answer.answerText,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback ?? null
      }))
    };
  }
}
