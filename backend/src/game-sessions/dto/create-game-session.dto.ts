import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { UserEnvironmentEnum } from "../../users/enums/user-environment.enum";
import { UserGenderEnum } from "../../users/enums/user-gender.enum";

export class CreateGameSessionDto {
  @ApiPropertyOptional({
    enum: UserGenderEnum,
    example: UserGenderEnum.FEMALE
  })
  @IsOptional()
  @IsEnum(UserGenderEnum)
  gender?: UserGenderEnum;

  @ApiPropertyOptional({
    example: 25,
    minimum: 1,
    maximum: 120
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({
    enum: UserEnvironmentEnum,
    example: UserEnvironmentEnum.OFFICE
  })
  @IsOptional()
  @IsEnum(UserEnvironmentEnum)
  environment?: UserEnvironmentEnum;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: 10,
    description: "How many generated questions to include in the session."
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  questionCount?: number;
}
