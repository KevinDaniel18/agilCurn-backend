import {
  Body,
  Controller,
  Delete,
  Headers,
  NotFoundException,
  Post,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-user.dto';
import { Request, Response } from 'express';
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UserService } from 'src/user.service';
import { JwtService } from '@nestjs/jwt';
import { ResetPasswordDto } from './dto/reset.password.dto';

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

  @Post('/reset-password')
  async resetPassword(
    @Req() request: Request,
    @Res() response: Response,
    @Body() resetPasswordDto: ResetPasswordDto, 
  ): Promise<any> {
    try {
      const { token, newPassword } = resetPasswordDto;

      console.log('Token received:', token);

      await this.authService.resetPassword(resetPasswordDto);
      return response.status(200).json({
        status: 'Ok!',
        message: 'Password reset successfully!',
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
      const token = authorization?.split(' ')[1]; 
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

  // @Post('/search-by-email')
  // async searchUserByEmail(
  //   @Req() request: Request,
  //   @Res() response: Response,
  //   @Query('email') email: string,
  //   @Query('projectName') projectName: string,
  // ): Promise<any> {
  //   try {
  //     if (!email) {
  //       throw new NotFoundException('Email parameter is missing');
  //     }
  //     const user = await this.userService.getUserByEmail(email);

  //     if (!user) {
  //       throw new NotFoundException('User not found');
  //     }

  //     // Enviar correo electrónico al usuario encontrado
  //     await this.authService.addMemberEmail(
  //       user.email,
  //       user.fullname,
  //       projectName,
  //     );

  //     return response.status(200).json({
  //       status: 'Ok!',
  //       message: 'User found and email sent!',
  //       user: user,
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     return response.status(500).json({
  //       status: 'Error!',
  //       message: 'Internal Server Error!',
  //     });
  //   }
  // }

  @Post('/invite-to-project')
  async inviteToProject(
    @Req() request: Request,
    @Res() response: Response,
    @Body()
    { emails, projectName }: { emails: string[]; projectName: string },
  ): Promise<any> {
    try {
      // Lógica para invitar al usuario al proyecto
      const recipients = await Promise.all(
        emails.map(async(email)=>{

          const user = await this.userService.getUserByEmail(email);
          return {email, fullname: user ? user.fullname: "User"}
        })
      )
      await this.authService.addMemberEmail(recipients, projectName);

      return response.status(200).json({
        status: 'Ok!',
        message: 'Invitation sent successfully!',
        invitedUserName: recipients,
      });
    } catch (error) {
      console.log(error);
      return response.status(500).json({
        status: 'Error!',
        message: 'Internal Server Error!',
      });
    }
  }

  @Get('invitation-confirmation')
  async handleInvitationConfirmation(
    @Res() res: Response,
    @Query('email') email: string,
    @Query('name') name: string,
  ): Promise<any> {
    const user = await this.userService.getUserByEmail(email);
    if (user === null) {
      return res.status(404).json({
        status: 'Error',
        message: 'User not found',
      });
    }
    return res.status(200).json({
      status: 'Ok!',
      message: `¡Hola, ${name}! Invitación aceptada.`,
      name: user.fullname,
    });
  }
}
