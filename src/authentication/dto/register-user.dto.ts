import { IsString, Length } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @Length(5, 20)
  fullname: string;
  @IsString()
  @Length(5, 20)
  email: string;
  @IsString()
  @Length(6, 20)
  password: string;
}
