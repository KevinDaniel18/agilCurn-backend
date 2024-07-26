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
import { ResetPasswordDto } from './dto/reset.password.dto';
import * as jwt from 'jsonwebtoken';

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

    const token = this.jwtService.sign({ email: users.email, id: users.id, name: users.fullname });

    return {
      token,
      userId: users.id,
      fullname: users.fullname
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

    const payload = { userId: user.id };
    const secretKey = process.env.JWT_SECRET;
    const token = jwt.sign(payload, secretKey, { expiresIn: '10h' });
    await this.saveResetToken(user.id, token);
    await this.mailService.sendPasswordResetEmail(user.email, token);
  }

  async saveResetToken(userId: number, resetToken: string): Promise<void> {
    const payload = { userId: userId, resetToken: resetToken };
    const secretKey = process.env.JWT_SECRET;
    const token = jwt.sign(payload, secretKey);
    await this.prismaService.user.update({
      where: { id: userId },
      data: { resetToken: token, resetUsed: false },
    });
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    // Verificar y decodificar el token
    const userId = await this.verifyResetToken(token);
    console.log(userId);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { resetUsed: true },
    });

    if (user.resetUsed) {
      throw new Error('Reset token has already been used');
    }

    // Actualizar la contraseña en la base de datos
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        resetUsed: true,
      },
    });

    await this.invalidateResetToken(userId);
  }

  async invalidateResetToken(userId: number): Promise<void> {
    // Eliminar el token de reinicio de la base de datos
    await this.prismaService.user.update({
      where: { id: userId },
      data: { resetToken: null },
    });
  }

  async verifyResetToken(token: string): Promise<number> {
    try {
      // Decodificar el token para obtener el payload
      const decodedToken: any = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded token:', decodedToken);

      // Verificar si el token incluye el ID de usuario
      if (!decodedToken || !decodedToken.userId) {
        throw new Error('Invalid token');
      }

      // Verificar si el usuario existe en la base de datos
      const userId = parseInt(decodedToken.userId);
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Devolver el ID de usuario si todo es válido
      return userId;
    } catch (error) {
      console.log('Error verifying reset token:', error.message);
      throw new Error('Invalid token');
    }
  }

  // auth.service.ts

  async addMemberEmail(recipients:{email: string, fullname: string}[], projectName: string ): Promise<void> {
    await this.mailService.addMemberEmail(recipients, projectName);
  }
}
