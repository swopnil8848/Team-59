import { UserRecord } from "./user-record.interface";

export interface IUsersRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(email: string, passwordHash: string): Promise<UserRecord>;
  updateProfile(
    id: string,
    data: {
      name?: string;
      avatar?: string;
      email?: string;
      gender?: string;
      age?: number;
      environment?: string;
    }
  ): Promise<UserRecord>;
}
