import { Module } from "@nestjs/common";
import { USERS_REPOSITORY } from "../common/constants/injection-tokens";
import { UsersController } from "./users.controller";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    {
      provide: USERS_REPOSITORY,
      useExisting: UsersRepository
    }
  ],
  exports: [UsersService, UsersRepository, USERS_REPOSITORY]
})
export class UsersModule {}
