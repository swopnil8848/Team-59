import { BaseUserDto } from "./base-user.dto";

export class UserProfileDto extends BaseUserDto {
  updatedAt!: Date;
}
