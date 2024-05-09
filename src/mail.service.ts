import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'kevnsc18@gmail.com',
        pass: 'nbsw rzxm vwnt bcce',
      },
    });
  }

  async welcomeEmail(email: string, fullname: string): Promise<void> {
    const mailOptions = {
      from: 'kevnsc18@gmail.com',
      to: email,
      subject: 'Welcome to agilCurn',
      text: `Hi! ${fullname}, you have registered successfully.`,
    };
    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetLink = `http://192.168.1.6:5173/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: 'kevnsc18@gmail.com',
      to: email,
      subject: 'Password Recovery',
      html: `Click <a href="${resetLink}">here</a> to reset your password.`,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
