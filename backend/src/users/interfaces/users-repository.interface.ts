import { UserRecord } from "./user-record.interface";

export interface IUsersRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(email: string, passwordHash: string): Promise<UserRecord>;
}
