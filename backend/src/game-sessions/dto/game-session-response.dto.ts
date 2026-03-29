import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { GameQuestionStatusEnum } from "../enums/game-question-status.enum";
import { GameSessionStatusEnum } from "../enums/game-session-status.enum";

export class GameAnswerOptionDto {
  @ApiProperty({
    format: "uuid",
    example: "749029ef-cbaf-4ef6-ad47-b8ac91312495"
  })
  id!: string;

  @ApiProperty({
    example: "Take a short break, reflect calmly, and later ask for constructive feedback."
  })
  answerText!: string;

  @ApiProperty({ example: "correct" })
  category!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: "Thank you, that helps me."
  })
  feedback!: string | null;
}

export class SelectedGameAnswerDto extends GameAnswerOptionDto {
  @ApiProperty({ example: "correct" })
  category!: string;

  @ApiPropertyOptional({
    nullable: true,
    example: "Thank you, that helps me."
  })
  feedback!: string | null;
}

export class GameQuestionDto {
  @ApiProperty({
    format: "uuid",
    example: "fef8f36e-cf03-4860-882f-2ea89b25f75a"
  })
  id!: string;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: true })
  outsider!: boolean;

  @ApiProperty({
    example:
      "You feel anxious about an upcoming presentation and keep delaying preparation. What would help you move forward gently?"
  })
  questionText!: string;

  @ApiProperty({
    enum: GameQuestionStatusEnum,
    example: GameQuestionStatusEnum.PENDING
  })
  status!: GameQuestionStatusEnum;

  @ApiPropertyOptional({
    example: "This question explores coping patterns under pressure.",
    nullable: true
  })
  explanation!: string | null;

  @ApiProperty({ type: [GameAnswerOptionDto] })
  answers!: GameAnswerOptionDto[];
}

export class GameSessionSummaryDto {
  @ApiProperty({
    format: "uuid",
    example: "bb6f520b-f4ad-4262-9c7e-a24b1f3a0c7d"
  })
  id!: string;

  @ApiProperty({
    enum: GameSessionStatusEnum,
    example: GameSessionStatusEnum.IN_PROGRESS
  })
  status!: GameSessionStatusEnum;

  @ApiProperty({ example: 0 })
  lastQuestionIndex!: number;

  @ApiProperty({ example: 3 })
  totalQuestions!: number;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2026-03-28T06:15:00.000Z"
  })
  startedAt!: Date;

  @ApiPropertyOptional({
    type: String,
    format: "date-time",
    nullable: true,
    example: null
  })
  completedAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    example: null
  })
  feedback!: string | null;
}

export class CreateGameSessionResponseDto {
  @ApiProperty({ type: GameSessionSummaryDto })
  session!: GameSessionSummaryDto;

  @ApiProperty({ type: [GameQuestionDto] })
  questions!: GameQuestionDto[];
}

export class GetGameSessionResponseDto {
  @ApiProperty({ type: GameSessionSummaryDto })
  session!: GameSessionSummaryDto;

  @ApiPropertyOptional({
    type: GameQuestionDto,
    nullable: true
  })
  currentQuestion!: GameQuestionDto | null;
}

export class AnswerGameQuestionResponseDto {
  @ApiProperty({ example: true })
  saved!: boolean;

  @ApiProperty({ type: GameSessionSummaryDto })
  session!: GameSessionSummaryDto;

  @ApiProperty({ example: false })
  isCompleted!: boolean;

  @ApiProperty({ type: SelectedGameAnswerDto })
  selectedAnswer!: SelectedGameAnswerDto;

  @ApiPropertyOptional({
    type: GameQuestionDto,
    nullable: true
  })
  nextQuestion!: GameQuestionDto | null;
}
