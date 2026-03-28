import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRecord } from "./interfaces/user-record.interface";
import { IUsersRepository } from "./interfaces/users-repository.interface";

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    return (await this.prisma.user.findUnique({ where: { email } })) as UserRecord | null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return (await this.prisma.user.findUnique({ where: { id } })) as UserRecord | null;
  }

  async create(email: string, passwordHash: string): Promise<UserRecord> {
    return (await this.prisma.user.create({
      data: {
        email,
        passwordHash
      }
    })) as UserRecord;
  }
}
