export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  gender: string | null;
  age: number | null;
  environment: string | null;
  createdAt: Date;
  updatedAt: Date;
}
