import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRecord } from "./interfaces/user-record.interface";
import { IUsersRepository } from "./interfaces/users-repository.interface";

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(email: string, passwordHash: string): Promise<UserRecord> {
    return this.prisma.user.create({
      data: {
        email,
        passwordHash
      }
    });
  }
}
