import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailOptions {
  email: string;
  subject: string;
  message: string;
}

// Port of utils/sendEmail.js (Nodemailer SMTP transport)
@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async send(options: MailOptions): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('email.host'),
      port: this.config.get<number>('email.port'), // if secure false port = 587, if true port= 465
      auth: {
        user: this.config.get<string>('email.user'),
        pass: this.config.get<string>('email.password'),
      },
    });

    await transporter.sendMail({
      from: this.config.get<string>('email.from') ?? 'E-shop App <ahmed1999khaledaboamer1999@gmail.com>',
      to: options.email,
      subject: options.subject,
      text: options.message,
    });
  }
}
