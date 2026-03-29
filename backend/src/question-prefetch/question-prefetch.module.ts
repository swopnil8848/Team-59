import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { QuestionGenerationService } from "./question-generation.service";
import { QuestionPrefetchService } from "./question-prefetch.service";
import { RedisService } from "./redis.service";

@Module({
  imports: [PrismaModule],
  providers: [RedisService, QuestionGenerationService, QuestionPrefetchService],
  exports: [QuestionGenerationService, QuestionPrefetchService]
})
export class QuestionPrefetchModule {}
