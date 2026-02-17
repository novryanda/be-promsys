import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY', '');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not set — email sending is disabled. Set RESEND_API_KEY in .env to enable.',
      );
    }
    this.fromEmail = this.config.get<string>(
      'RESEND_FROM_EMAIL',
      'noreply@promsys.app',
    );
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.warn(
        `Email to ${to} skipped — Resend API key not configured`,
      );
      return false;
    }
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        return false;
      }

      this.logger.log(`Email sent to ${to}: ${data?.id}`);
      return true;
    } catch (err) {
      this.logger.error(`Email send error: ${err}`);
      return false;
    }
  }
}
