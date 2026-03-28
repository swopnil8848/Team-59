import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { USERS_REPOSITORY } from "../common/constants/injection-tokens";
import { UserProfileDto } from "./dto/user-profile.dto";
import { IUsersRepository } from "./interfaces/users-repository.interface";
import { toUserProfileDto } from "./users.mapper";

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository
  ) {}

  async getCurrentUser(userId: string): Promise<UserProfileDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return toUserProfileDto(user);
  }
}
