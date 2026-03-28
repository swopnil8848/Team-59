import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { JwtUser } from "../common/interfaces/jwt-user.interface";
import { createResponse } from "../common/utils/response.util";
import { CreateOnboardingResponseDto } from "./dto/create-onboarding-response.dto";
import {
  GetCurrentOnboardingResponseDto,
  GetOnboardingQuestionsResponseDto,
  SaveOnboardingResponseDto
} from "./dto/questions-response.dto";
import { UpdateOnboardingResponseDto } from "./dto/update-onboarding-response.dto";
import { OnboardingService } from "./onboarding.service";

@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get("questions")
  async getQuestions() {
    const payload: GetOnboardingQuestionsResponseDto =
      await this.onboardingService.getQuestions();
    return createResponse(payload, "Onboarding questions retrieved successfully");
  }

  @UseGuards(JwtAuthGuard)
  @Get("responses/me")
  async getMyResponse(@CurrentUser() user: JwtUser) {
    const response = await this.onboardingService.getCurrentResponse(user.sub);
    const data: GetCurrentOnboardingResponseDto = { response };
    return createResponse(data, "Onboarding response retrieved successfully");
  }

  @UseGuards(JwtAuthGuard)
  @Post("responses")
  async createResponse(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateOnboardingResponseDto
  ) {
    const response = await this.onboardingService.createResponse(user.sub, dto);
    const data: SaveOnboardingResponseDto = { response };
    return createResponse(data, "Onboarding response created successfully");
  }

  @UseGuards(JwtAuthGuard)
  @Patch("responses/me")
  async updateResponse(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateOnboardingResponseDto
  ) {
    const response = await this.onboardingService.updateResponse(user.sub, dto);
    const data: SaveOnboardingResponseDto = { response };
    return createResponse(data, "Onboarding response updated successfully");
  }
}
