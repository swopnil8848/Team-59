import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsUUID, Min } from "class-validator";

export class AnswerGameQuestionDto {
  @ApiProperty({
    format: "uuid",
    example: "749029ef-cbaf-4ef6-ad47-b8ac91312495"
  })
  @IsUUID()
  selectedAnswerId!: string;

  @ApiPropertyOptional({
    example: 4200,
    minimum: 0,
    description: "Optional client-side response time in milliseconds."
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  responseTimeMs?: number;
}
