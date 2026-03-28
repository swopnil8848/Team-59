import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { JwtUser } from "../common/interfaces/jwt-user.interface";
import {
  ApiEnvelopeResponse,
  ApiStandardErrorResponses
} from "../common/swagger/api-response.decorator";
import { createResponse } from "../common/utils/response.util";
import { AnswerGameQuestionDto } from "./dto/answer-game-question.dto";
import { CreateGameSessionDto } from "./dto/create-game-session.dto";
import {
  AnswerGameQuestionResponseDto,
  CreateGameSessionResponseDto,
  GetGameSessionResponseDto
} from "./dto/game-session-response.dto";
import { GameSessionsService } from "./game-sessions.service";

@ApiTags("Game Sessions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("game-sessions")
export class GameSessionsController {
  constructor(private readonly gameSessionsService: GameSessionsService) {}

  @Post()
  @ApiOperation({
    summary: "Create a new game session and generate the full question set"
  })
  @ApiBody({ type: CreateGameSessionDto, required: false })
  @ApiEnvelopeResponse({
    description: "Game session created successfully",
    type: CreateGameSessionResponseDto,
    status: 201
  })
  @ApiStandardErrorResponses({ unauthorized: true })
  async createSession(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateGameSessionDto = {}
  ) {
    const payload = await this.gameSessionsService.createSession(user.sub, dto);
    return createResponse(payload, "Game session created successfully");
  }

  @Get(":sessionId")
  @ApiOperation({
    summary: "Get the current game session state and next unanswered question"
  })
  @ApiParam({
    name: "sessionId",
    format: "uuid"
  })
  @ApiEnvelopeResponse({
    description: "Game session retrieved successfully",
    type: GetGameSessionResponseDto
  })
  @ApiStandardErrorResponses({ unauthorized: true })
  async getSession(@CurrentUser() user: JwtUser, @Param("sessionId") sessionId: string) {
    const payload = await this.gameSessionsService.getSession(user.sub, sessionId);
    return createResponse(payload, "Game session retrieved successfully");
  }

  @Post(":sessionId/questions/:questionId/response")
  @ApiOperation({
    summary: "Save the user's selected answer for a generated question"
  })
  @ApiParam({
    name: "sessionId",
    format: "uuid"
  })
  @ApiParam({
    name: "questionId",
    format: "uuid"
  })
  @ApiBody({ type: AnswerGameQuestionDto })
  @ApiEnvelopeResponse({
    description: "Question response saved successfully",
    type: AnswerGameQuestionResponseDto
  })
  @ApiStandardErrorResponses({ unauthorized: true })
  async answerQuestion(
    @CurrentUser() user: JwtUser,
    @Param("sessionId") sessionId: string,
    @Param("questionId") questionId: string,
    @Body() dto: AnswerGameQuestionDto
  ) {
    const payload = await this.gameSessionsService.answerQuestion(
      user.sub,
      sessionId,
      questionId,
      dto
    );
    return createResponse(payload, "Question response saved successfully");
  }
}
