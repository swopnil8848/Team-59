import { BaseUserDto } from "../../users/dto/base-user.dto";

export class AuthTokenDto {
  accessToken!: string;
  tokenType!: "Bearer";
  expiresIn!: string;
}

export class AuthenticatedUserDto extends BaseUserDto {}

export class AuthResponseDto {
  user!: AuthenticatedUserDto;
  tokens!: AuthTokenDto;
}
