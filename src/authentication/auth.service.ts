import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user.service';
import { LoginDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { User } from 'src/user.model';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}
  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    const users = await this.prismaService.user.findUnique({
      where: { email },
    });
    console.log(users);

    if (!users) {
      console.log('email not found');
      throw new NotFoundException('email not found');
    }
    const validatePassword = await bcrypt.compare(password, users.password);
    console.log(validatePassword);
    if (!validatePassword) {
      console.log('invalid password');

      throw new UnauthorizedException('invalid password');
    }

    const token = this.jwtService.sign({ email: users.email, id: users.id });

    return {
      token,
    };
  }

  async register(createDto: RegisterUserDto): Promise<any> {
    const createUsers = new User();
    createUsers.fullname = createDto.fullname;
    createUsers.email = createDto.email;
    createUsers.password = await bcrypt.hash(createDto.password, 10);
    createUsers.repeatPassword = createDto.repeatPassword;

    const user = await this.userService.createUser(createUsers);
    console.log(user);

    const token = this.jwtService.sign({ email: user.email, id: user.id });

    return {
      token
    };
  }
}
