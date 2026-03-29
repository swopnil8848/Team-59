import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  EligibleUserQuestionProfile,
  GeneratedQuestionPayload,
  GeneratedQuestionSet
} from "./interfaces/generated-question-set.interface";

@Injectable()
export class QuestionGenerationService {
  constructor(private readonly configService: ConfigService) {}

  buildGenerationContext(input: {
    gender: string;
    age: number;
    environment: string;
  }) {
    return {
      gender: input.gender,
      age: input.age,
      environment: input.environment
    };
  }

  async generateQuestionsForProfile(
    input: Omit<EligibleUserQuestionProfile, "id">
  ): Promise<GeneratedQuestionSet> {
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
        body: JSON.stringify({
          gender: input.gender,
          age: input.age,
          environment: input.environment
        })
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

  private normalizeGeneratedQuestions(payload: unknown): GeneratedQuestionSet {
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

    const questions = rawQuestions.map((question, index) =>
      this.normalizeQuestion(question, index)
    );

    return {
      questionSetId,
      questions
    };
  }

  private normalizeQuestion(question: unknown, index: number): GeneratedQuestionPayload {
    if (!question || typeof question !== "object") {
      throw new BadGatewayException("NPC question generation returned a malformed question");
    }

    const rawQuestion = question as Record<string, unknown>;
    const questionText = rawQuestion.question;
    const outsider = rawQuestion.outsider;
    const rawAnswers = rawQuestion.answers;

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

      const rawAnswer = answer as Record<string, unknown>;

      if (typeof rawAnswer.text !== "string" || rawAnswer.text.trim().length === 0) {
        throw new BadGatewayException("NPC question generation returned an answer without text");
      }

      if (typeof rawAnswer.correct !== "boolean") {
        throw new BadGatewayException(
          "NPC question generation returned an answer without correctness"
        );
      }

      return {
        text: rawAnswer.text.trim(),
        correct: rawAnswer.correct,
        feedback: typeof rawAnswer.feedback === "string" ? rawAnswer.feedback.trim() : null
      };
    });

    return {
      order: index + 1,
      outsider,
      questionText: questionText.trim(),
      explanation: null,
      answers
    };
  }
}
