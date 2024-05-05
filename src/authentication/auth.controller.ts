import {
  Body,
  Controller,
  Delete,
  Headers,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-user.dto';
import { Request, Response } from 'express';
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UserService } from 'src/user.service';
import { JwtService } from '@nestjs/jwt';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('/login')
  async login(
    @Req() request: Request,
    @Res() response: Response,
    @Body() loginDto: LoginDto,
  ): Promise<any> {
    try {
      const result = await this.authService.login(loginDto);
      return response.status(200).json({
        status: 'Ok!',
        message: 'Succesfully login!',
        result: result,
      });
    } catch (error) {
      console.log(error);

      return response.status(500).json({
        status: 'Error!',
        message: 'Internal Server Error!',
      });
    }
  }

  @Post('/register')
  async register(
    @Req() request: Request,
    @Res() response: Response,
    @Body() registerDto: RegisterUserDto,
  ): Promise<any> {
    try {
      const result = await this.authService.register(registerDto);

      await this.authService.sendWelcomeEmail(
        registerDto.email,
        registerDto.fullname,
      );
      return response.status(200).json({
        status: 'Ok!',
        message: 'Succesfully register user and email sent!',
        result: result,
      });
    } catch (error) {
      console.log(error);

      return response.status(500).json({
        status: 'Error!',
        message: 'Internal Server Error!',
      });
    }
  }

  @Post('/forgot-password')
  async forgotPassword(
    @Req() request: Request,
    @Res() response: Response,
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<any> {
    try {
      await this.authService.forgotPassword(forgotPasswordDto.email);
      return response.status(200).json({
        status: 'Ok!',
        message: 'Email sent for password reset!',
      });
    } catch (error) {
      console.log(error);
      return response.status(500).json({
        status: 'Error!',
        message: 'Internal Server Error!',
      });
    }
  }

  @Delete('/delete-by-email-password')
  async deleteUserByEmailAndPassword(
    @Req() request: Request,
    @Res() response: Response,
    @Headers('authorization') authorization: string,
    @Body() { email, password }: { email: string; password: string },
  ): Promise<any> {
    try {
      const token = authorization?.split(' ')[1]; // Extracting token from header
      if (token) {
        try {
          const decodedToken: any = this.jwtService.verify(token);

          const userId = decodedToken.id;
          await this.userService.deleteUserByIdAndCredentials(
            userId,
            email,
            password,
          );
        } catch (error) {
          console.error(error);
          return response.status(401).json({
            status: 'Error!',
            message: 'Invalid token or token missing',
          });
        }
      } else {
        // Handle missing authorization header (e.g., throw an error)
        throw new UnauthorizedException('Authorization header is missing');
      }

      return response.status(200).json({
        status: 'Ok!',
        message: 'User deleted successfully!',
      });
    } catch (error) {
      console.log(error);
      return response.status(500).json({
        status: 'Error!',
        message: 'Internal Server Error!',
      });
    }
  }
}
