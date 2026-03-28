import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from "class-validator";
import { UserEnvironmentEnum } from "../enums/user-environment.enum";
import { UserGenderEnum } from "../enums/user-gender.enum";

export class UpdateMyProfileDto {
  @ApiPropertyOptional({
    example: "Bitisha"
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: "https://cdn.example.com/avatars/user-1.png"
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @ApiPropertyOptional({
    example: "bitisha@example.com"
  })
  @IsOptional()
  @IsEmail()
  email?: string;

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
}
