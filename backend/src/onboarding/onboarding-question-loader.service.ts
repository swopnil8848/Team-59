import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ONBOARDING_REPOSITORY } from "../common/constants/injection-tokens";
import { IOnboardingRepository } from "./interfaces/onboarding-repository.interface";
import { OnboardingQuestionFile } from "./interfaces/onboarding-question-file.interface";

@Injectable()
export class OnboardingQuestionLoaderService implements OnModuleInit {
  private readonly logger = new Logger(OnboardingQuestionLoaderService.name);
  private cachedQuestionsFile: OnboardingQuestionFile | null = null;

  constructor(
    @Inject(ONBOARDING_REPOSITORY)
    private readonly onboardingRepository: IOnboardingRepository
  ) {}

  async onModuleInit() {
    await this.syncQuestionsFromFile();
  }

  getQuestionsFile(): OnboardingQuestionFile {
    if (!this.cachedQuestionsFile) {
      this.cachedQuestionsFile = this.readQuestionsFile();
    }

    return this.cachedQuestionsFile;
  }

  private readQuestionsFile(): OnboardingQuestionFile {
    const filePath = this.resolveQuestionsFilePath();
    return JSON.parse(readFileSync(filePath, "utf8")) as OnboardingQuestionFile;
  }

  private resolveQuestionsFilePath(): string {
    const candidates = [
      join(__dirname, "data", "onboarding-questions.json"),
      join(process.cwd(), "dist", "onboarding", "data", "onboarding-questions.json"),
      join(process.cwd(), "dist", "src", "onboarding", "data", "onboarding-questions.json"),
      join(process.cwd(), "src", "onboarding", "data", "onboarding-questions.json")
    ];

    const filePath = candidates.find((candidate) => existsSync(candidate));

    if (!filePath) {
      throw new Error("Could not find onboarding-questions.json in src or dist output");
    }

    return filePath;
  }

  private async syncQuestionsFromFile() {
    const file = this.getQuestionsFile();

    for (const question of file.questions) {
      await this.onboardingRepository.upsertQuestion({
        key: question.key,
        pageNo: question.pageNo,
        order: question.order,
        type: question.type,
        question: question.question,
        description: question.description ?? null,
        placeholder: question.placeholder ?? null,
        required: question.required,
        options: question.options as Prisma.InputJsonValue | undefined,
        isActive: true
      });
    }

    this.logger.log(`Synced ${file.questions.length} onboarding questions from JSON`);
  }
}
