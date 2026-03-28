export interface UserRecord {
  id: string;
  name: string | null;
  avatar: string | null;
  email: string;
  passwordHash: string;
  gender: string | null;
  age: number | null;
  environment: string | null;
  createdAt: Date;
  updatedAt: Date;
}
