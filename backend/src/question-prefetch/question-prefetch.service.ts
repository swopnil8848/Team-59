import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import {
  EligibleUserQuestionProfile,
  GeneratedQuestionSet
} from "./interfaces/generated-question-set.interface";
import { QuestionGenerationService } from "./question-generation.service";
import { RedisService } from "./redis.service";

@Injectable()
export class QuestionPrefetchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QuestionPrefetchService.name);
  private readonly lockTtlSeconds: number;
  private readonly backfillIntervalMs: number;
  private backfillTimer: NodeJS.Timeout | null = null;
  private readonly queuedUserIds = new Set<string>();
  private isProcessingQueue = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly questionGenerationService: QuestionGenerationService,
    private readonly configService: ConfigService
  ) {
    this.lockTtlSeconds = this.configService.get<number>("redis.prefetchLockTtlSeconds", 120);
    this.backfillIntervalMs = this.configService.get<number>(
      "redis.prefetchBackfillIntervalMs",
      60_000
    );
  }

  onModuleInit() {
    this.backfillTimer = setInterval(() => {
      void this.backfillMissingQuestionSets();
    }, this.backfillIntervalMs);
  }

  onModuleDestroy() {
    if (this.backfillTimer) {
      clearInterval(this.backfillTimer);
      this.backfillTimer = null;
    }
  }

  async hasPrefetchedQuestions(userId: string): Promise<boolean> {
    try {
      return await this.redisService.exists(this.getQuestionKey(userId));
    } catch (error) {
      this.logger.warn(
        `Could not check prefetched questions for user ${userId}: ${(error as Error).message}`
      );
      return false;
    }
  }

  async getPrefetchedQuestions(userId: string): Promise<GeneratedQuestionSet | null> {
    try {
      const payload = await this.redisService.get(this.getQuestionKey(userId));

      if (!payload) {
        return null;
      }

      const parsedPayload = this.parseGeneratedQuestionSet(payload);

      if (!parsedPayload) {
        await this.deletePrefetchedQuestions(userId);
      }

      return parsedPayload;
    } catch (error) {
      this.logger.warn(
        `Could not read prefetched questions for user ${userId}: ${(error as Error).message}`
      );
      return null;
    }
  }

  async deletePrefetchedQuestions(userId: string): Promise<void> {
    try {
      await this.redisService.del(this.getQuestionKey(userId));
    } catch (error) {
      this.logger.warn(
        `Could not delete prefetched questions for user ${userId}: ${(error as Error).message}`
      );
    }
  }

  async consumePrefetchedQuestions(userId: string): Promise<GeneratedQuestionSet | null> {
    return this.getPrefetchedQuestions(userId);
  }

  async enqueueQuestionPrefetch(userId: string): Promise<boolean> {
    try {
      const questionKey = this.getQuestionKey(userId);
      const lockKey = this.getLockKey(userId);
      const hasQuestions = await this.redisService.exists(questionKey);

      if (hasQuestions) {
        return false;
      }

      const lockCreated = await this.redisService.set(lockKey, "1", {
        nx: true,
        exSeconds: this.lockTtlSeconds
      });

      if (!lockCreated) {
        return false;
      }

      this.queuedUserIds.add(userId);
      void this.processQueue();

      return true;
    } catch (error) {
      this.logger.warn(
        `Could not enqueue question prefetch for user ${userId}: ${(error as Error).message}`
      );
      return false;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.queuedUserIds.size > 0) {
        const nextUserId = this.queuedUserIds.values().next().value as string | undefined;

        if (!nextUserId) {
          continue;
        }

        this.queuedUserIds.delete(nextUserId);
        await this.prefetchQuestionsForUser(nextUserId);
      }
    } finally {
      this.isProcessingQueue = false;

      if (this.queuedUserIds.size > 0) {
        void this.processQueue();
      }
    }
  }

  async prefetchQuestionsForUser(userId: string): Promise<void> {
    const questionKey = this.getQuestionKey(userId);
    const lockKey = this.getLockKey(userId);

    try {
      const hasQuestions = await this.redisService.exists(questionKey);

      if (hasQuestions) {
        return;
      }

      const userProfile = await this.getEligibleUserQuestionProfile(userId);

      if (!userProfile) {
        return;
      }

      const generatedQuestionSet =
        await this.questionGenerationService.generateQuestionsForProfile(userProfile);

      await this.redisService.set(questionKey, JSON.stringify(generatedQuestionSet), {
        nx: true
      });
    } catch (error) {
      this.logger.warn(
        `Question prefetch failed for user ${userId}: ${(error as Error).message}`
      );
    } finally {
      try {
        await this.redisService.del(lockKey);
      } catch (error) {
        this.logger.warn(
          `Could not release question prefetch lock for user ${userId}: ${(error as Error).message}`
        );
      }
    }
  }

  async backfillMissingQuestionSets(): Promise<void> {
    try {
      const eligibleUsers = await this.prisma.user.findMany({
        where: {
          gender: { not: null },
          age: { not: null },
          environment: { not: null }
        },
        select: {
          id: true
        }
      });

      for (const user of eligibleUsers) {
        await this.enqueueQuestionPrefetch(user.id);
      }
    } catch (error) {
      this.logger.warn(`Question prefetch backfill failed: ${(error as Error).message}`);
    }
  }

  private async getEligibleUserQuestionProfile(
    userId: string
  ): Promise<Omit<EligibleUserQuestionProfile, "id"> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        gender: true,
        age: true,
        environment: true
      }
    });

    if (!user?.gender || !user.age || !user.environment) {
      return null;
    }

    return {
      gender: user.gender,
      age: user.age,
      environment: user.environment
    };
  }

  private parseGeneratedQuestionSet(payload: string): GeneratedQuestionSet | null {
    try {
      const parsed = JSON.parse(payload) as GeneratedQuestionSet;

      if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private getQuestionKey(userId: string) {
    return `prefetch:questions:user:${userId}`;
  }

  private getLockKey(userId: string) {
    return `prefetch:lock:user:${userId}`;
  }
}
