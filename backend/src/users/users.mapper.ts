import { BaseUserDto } from "./dto/base-user.dto";
import { UserProfileDto } from "./dto/user-profile.dto";
import { UserRecord } from "./interfaces/user-record.interface";

export function toBaseUserDto(user: UserRecord): BaseUserDto {
  return {
    id: user.id,
    email: user.email,
    gender: user.gender,
    age: user.age,
    environment: user.environment,
    createdAt: user.createdAt
  };
}

export function toUserProfileDto(user: UserRecord): UserProfileDto {
  return {
    ...toBaseUserDto(user),
    updatedAt: user.updatedAt
  };
}
