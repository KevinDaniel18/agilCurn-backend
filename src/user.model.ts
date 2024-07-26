import { Prisma } from '@prisma/client';

export class User implements Prisma.UserCreateInput {
  id: number;
  fullname: string;
  email: string;
  password: string;
  resetToken?: string;
  resetUsed?: boolean;
  profileImage?: string;
}