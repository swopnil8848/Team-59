import { ApiProperty } from "@nestjs/swagger";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserEnvironmentEnum } from "../enums/user-environment.enum";
import { UserGenderEnum } from "../enums/user-gender.enum";

export class BaseUserDto {
  @ApiProperty({
    format: "uuid",
    example: "7f98fb40-9a70-4e95-9734-52c65546d9f0"
  })
  id!: string;

  @ApiProperty({ example: "user@example.com" })
  email!: string;

  @ApiPropertyOptional({
    enum: UserGenderEnum,
    nullable: true,
    example: UserGenderEnum.FEMALE
  })
  gender!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 25
  })
  age!: number | null;

  @ApiPropertyOptional({
    enum: UserEnvironmentEnum,
    nullable: true,
    example: UserEnvironmentEnum.OFFICE
  })
  environment!: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    example: "2026-03-28T05:00:00.000Z"
  })
  createdAt!: Date;
}
