import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, GameQuestion, GameQuestionAnswer, GameSession } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
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

type GameQuestionWithAnswers = GameQuestion & {
  outsider: boolean;
  answers: Array<
    GameQuestionAnswer & {
      isCorrect: boolean;
      feedback: string | null;
    }
  >;
};

type GameSessionWithQuestions = GameSession & {
  questions: GameQuestionWithAnswers[];
};

type GeneratedQuestionPayload = {
  order: number;
  outsider: boolean;
  questionText: string;
  explanation: string | null;
  answers: Array<{
    text: string;
    correct: boolean;
    feedback: string | null;
  }>;
};

@Injectable()
export class GameSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async createSession(userId: string): Promise<CreateGameSessionResponseDto> {
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
      gender: user.gender,
      age: user.age,
      environment: user.environment
    };

    if (!resolvedUserProfile.gender || !resolvedUserProfile.age || !resolvedUserProfile.environment) {
      throw new BadRequestException(
        "gender, age, and environment are required to start a game session"
      );
    }

    const generationContext = this.buildGenerationContext({
      gender: resolvedUserProfile.gender,
      age: resolvedUserProfile.age,
      environment: resolvedUserProfile.environment
    });

    const generatedQuestionSet = await this.generateQuestionsFromApi({
      gender: resolvedUserProfile.gender,
      age: resolvedUserProfile.age,
      environment: resolvedUserProfile.environment
    });

    const savedSession = await this.prisma.gameSession.create({
      data: {
        userId,
        status: GameSessionStatusEnum.IN_PROGRESS,
        generationContext: {
          ...(generationContext as Record<string, string | number>),
          questionSetId: generatedQuestionSet.questionSetId
        } satisfies Prisma.InputJsonValue,
        totalQuestions: generatedQuestionSet.questions.length,
        questions: {
          create: generatedQuestionSet.questions.map((question) => ({
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

  private async generateQuestionsFromApi(input: {
    gender: string;
    age: number;
    environment: string;
  }): Promise<{
    questionSetId: string | null;
    questions: GeneratedQuestionPayload[];
  }> {
    const baseUrl = this.configService.get<string>("integrations.aiBackendUrl");

    if (!baseUrl) {
      throw new InternalServerErrorException(
        "AI_BACKEND_URL is not configured for game session generation"
      );
    }

    let response: Response;

    try {
      response = await fetch(`${baseUrl.replace(/\/$/, "")}/npc-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    } catch {
      throw new BadGatewayException("Could not reach the NPC question generation service");
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `NPC question generation failed with status ${response.status}`
      );
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException("NPC question generation returned invalid JSON");
    }

    return this.normalizeGeneratedQuestions(payload);
  }

  private normalizeGeneratedQuestions(payload: unknown): {
    questionSetId: string | null;
    questions: GeneratedQuestionPayload[];
  } {
    if (!payload || typeof payload !== "object" || !("questions" in payload)) {
      throw new BadGatewayException("NPC question generation returned an invalid payload");
    }

    const parsedPayload = payload as {
      questionSetId?: unknown;
      questions: unknown;
    };
    const questionSetId =
      typeof parsedPayload.questionSetId === "string" ? parsedPayload.questionSetId : null;
    const rawQuestions = parsedPayload.questions;

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new BadGatewayException("NPC question generation returned no questions");
    }

    const questions = rawQuestions.map((question, index) => {
      if (!question || typeof question !== "object") {
        throw new BadGatewayException("NPC question generation returned a malformed question");
      }

      const questionText = question.question;
      const outsider = question.outsider;
      const rawAnswers = question.answers;

      if (typeof questionText !== "string" || questionText.trim().length === 0) {
        throw new BadGatewayException("NPC question generation returned a question without text");
      }

      if (typeof outsider !== "boolean") {
        throw new BadGatewayException(
          "NPC question generation returned a question without outsider state"
        );
      }

      if (!Array.isArray(rawAnswers) || rawAnswers.length === 0) {
        throw new BadGatewayException("NPC question generation returned a question without answers");
      }

      const answers = rawAnswers.map((answer) => {
        if (!answer || typeof answer !== "object") {
          throw new BadGatewayException("NPC question generation returned a malformed answer");
        }

        if (typeof answer.text !== "string" || answer.text.trim().length === 0) {
          throw new BadGatewayException("NPC question generation returned an answer without text");
        }

        if (typeof answer.correct !== "boolean") {
          throw new BadGatewayException(
            "NPC question generation returned an answer without correctness"
          );
        }

        return {
          text: answer.text.trim(),
          correct: answer.correct,
          feedback: typeof answer.feedback === "string" ? answer.feedback.trim() : null
        };
      });

      return {
        order: index + 1,
        outsider,
        questionText: questionText.trim(),
        explanation: null,
        answers
      };
    });

    return {
      questionSetId,
      questions
    };
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
