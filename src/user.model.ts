import { Prisma } from "@prisma/client";


export class User implements Prisma.UserCreateInput{
    id: number
    fullname: string;
    email: string;
    password: string;
    repeatPassword: string;
}