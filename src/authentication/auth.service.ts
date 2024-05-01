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
import { MailService } from 'src/mail.service';
import * as uuid from 'uuid';

@Injectable()
export class AuthService {
  sendWelComeEmail() {
    throw new Error('Method not implemented.');
  }
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly mailService: MailService,
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


  async sendWelcomeEmail(email: string, fullname: string): Promise<void> {
    await this.mailService.welcomeEmail(email, fullname);
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
      token,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = this.generateResetToken();
    await this.saveResetToken(user.id, resetToken);
    await this.mailService.sendPasswordResetEmail(
      user.email,
      user.repeatPassword,
    );
  }

  // Función para generar un token único para la recuperación de contraseña
  private generateResetToken(): string {
    // Implementar la lógica para generar un token único
    // Por ejemplo, puedes usar una librería como `uuid` para generar un UUID único
    const resetToken = uuid.v4();
    return resetToken;
  }

  // Función para guardar el token de recuperación de contraseña en la base de datos (no implementada aquí)
  async saveResetToken(userId: number, resetToken: string): Promise<void> {
    // Implementar la lógica para guardar el token asociado al usuario en la base de datos
  }
}
