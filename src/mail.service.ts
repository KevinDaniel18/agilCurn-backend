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
        pass: process.env.MAIL_SECRET,
      },
    });
  }

  async welcomeEmail(email: string, fullname: string): Promise<void> {
    const mailOptions = {
      from: 'kevnsc18@gmail.com',
      to: email,
      subject: 'Welcome to agilCurn',
      html: `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
              padding: 20px;
            }
            .container {
              background-color: #fff;
              border-radius: 8px;
              padding: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome to agilCurn</h1>
            <p>Hi ${fullname},</p>
            <p>You have registered successfully.</p>
          </div>
        </body>
      </html>
    `,
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
      html: `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
              padding: 20px;
            }
            .container {
              background-color: #fff;
              border-radius: 8px;
              padding: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
            }
            .reset-link {
              margin-top: 20px;
            }
            .reset-link a {
              color: #007bff;
              text-decoration: none;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Password Recovery</h1>
            <p>You have requested to reset your password.</p>
            <p>To reset your password, click the following link:</p>
            <p class="reset-link"><a href="${resetLink}">Reset Password</a></p>
          </div>
        </body>
      </html>
    `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async addMemberEmail(
    recipients: { email: string; fullname: string }[],
    projectName: string,
  ): Promise<void> {
    for (const { email, fullname } of recipients) {
      const invitationLink = `http://192.168.1.6:3000/auth/invitation-confirmation?email=${encodeURIComponent(
        email,
      )}&name=${encodeURIComponent(fullname)}`;
      const mailOptions = {
        from: 'kevnsc18@gmail.com',
        to: email,
        subject: `¡Hola, ${fullname}! Has sido invitado al proyecto ${projectName}`,
        html: `
        <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f5f5f5;
                        padding: 20px;
                    }
                    .container {
                        background-color: #fff;
                        border-radius: 8px;
                        padding: 20px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    h1 {
                        color: #333;
                    }
                    .invitation-link {
                        margin-top: 20px;
                    }
                    .invitation-link a {
                        color: #007bff;
                        text-decoration: none;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>¡Hola, ${fullname}!</h1>
                    <p>Has sido invitado al proyecto <b>${projectName}</b>.</p>
                    <p>Para ingresar al proyecto, haz clic en el siguiente enlace:</p>
                    <p class="invitation-link"><a href="${invitationLink}">Ingresar al proyecto</a></p>
                </div>
            </body>
        </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
    }
  }
}
