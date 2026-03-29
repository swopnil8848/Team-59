import { Module } from "@nestjs/common";
import { QuestionPrefetchModule } from "../question-prefetch/question-prefetch.module";
import { GameSessionsController } from "./game-sessions.controller";
import { GameSessionsService } from "./game-sessions.service";

@Module({
  imports: [QuestionPrefetchModule],
  controllers: [GameSessionsController],
  providers: [GameSessionsService]
})
export class GameSessionsModule {}
