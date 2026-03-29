import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { USERS_REPOSITORY } from "../common/constants/injection-tokens";
import { QuestionPrefetchService } from "../question-prefetch/question-prefetch.service";
import { UserProfileDto } from "./dto/user-profile.dto";
import { UpdateMyProfileDto } from "./dto/update-my-profile.dto";
import { IUsersRepository } from "./interfaces/users-repository.interface";
import { toUserProfileDto } from "./users.mapper";

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly questionPrefetchService: QuestionPrefetchService
  ) {}

  async getCurrentUser(userId: string): Promise<UserProfileDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return toUserProfileDto(user);
  }

  async updateCurrentUser(
    userId: string,
    dto: UpdateMyProfileDto
  ): Promise<UserProfileDto> {
    const existingUser = await this.usersRepository.findById(userId);

    if (!existingUser) {
      throw new NotFoundException("User not found");
    }

    if (dto.email && dto.email !== existingUser.email) {
      const userWithEmail = await this.usersRepository.findByEmail(dto.email);

      if (userWithEmail && userWithEmail.id !== userId) {
        throw new BadRequestException("Email is already in use");
      }
    }

    const updatedUser = await this.usersRepository.updateProfile(userId, dto);
    const becameEligibleForPrefetch =
      (!existingUser.gender || !existingUser.age || !existingUser.environment) &&
      !!updatedUser.gender &&
      !!updatedUser.age &&
      !!updatedUser.environment;

    if (becameEligibleForPrefetch) {
      await this.questionPrefetchService.enqueueQuestionPrefetch(userId);
    }

    return toUserProfileDto(updatedUser);
  }
}
