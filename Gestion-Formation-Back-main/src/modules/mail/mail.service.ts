import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const host = this.config.get<string>('SMTP_HOST');

    if (user && pass && host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT') || 587,
        secure: false,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP not fully configured (SMTP_USER/PASS/HOST) — emails will be logged only');
    }
  }

  async send(options: { to: string; subject: string; html: string }) {
    const from = this.config.get<string>('MAIL_FROM') || 'noreply@formapro.fr';

    if (!this.transporter) {
      this.logger.log(`[EMAIL LOG] To: ${options.to} | Subject: ${options.subject}`);
      this.logger.log(`[EMAIL LOG] Body: ${options.html}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from, ...options });
      this.logger.log(`Email sent to ${options.to}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}`, err);
    }
  }
}
