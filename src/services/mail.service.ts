/**
 * Mail Service
 * Handles all email sending functionality using Nodemailer
 * Supports both direct sending and queue-based sending
 */

import { ValidationError } from '@/lib/errors';
import { MailUtils } from '@/lib/utils/mail-utils';
import { addEmailToQueue, addUrgentEmailToQueue } from '@/queues/email.queue';
import {
  AccountStatusChangeEmailData,
  AccountVerificationEmailData,
  BulkLoanReminderEmailData,
  EmailOptions,
  EmailTemplate,
  EmailTemplateData,
  LoanNotificationEmailData,
  LoanOverdueEmailData,
  LoanReminderEmailData,
  PasswordResetEmailData,
  ReservationConfirmationEmailData,
  ReservationReadyEmailData,
  SendEmailResult,
  WelcomeEmailData,
} from '@/types/mail';
import nodemailer, { Transporter } from 'nodemailer';

export class MailService {
  private static transporter: Transporter | null = null;

  /**
   * Initialize email transporter
   */
  private static getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    // Get configuration from environment variables
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '587', 10);
    const emailSecure = process.env.EMAIL_SECURE === 'true'; // true for 465, false for other ports

    if (!emailUser || !emailPassword) {
      throw new Error(
        'Email configuration missing. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.'
      );
    }

    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailSecure,
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
      // For development/testing with services like Ethereal
      ...(process.env.NODE_ENV === 'development' && {
        tls: {
          rejectUnauthorized: false,
        },
      }),
    });

    return this.transporter;
  }

  /**
   * Get default sender email
   */
  private static getDefaultSender(): string {
    return process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@library.com';
  }

  /**
   * Send email with provided options
   * By default, emails are sent directly without queue
   */
  static async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
    try {
      // Validate email addresses
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const { invalid } = MailUtils.validateEmailList(recipients);

      if (invalid.length > 0) {
        throw new ValidationError(`Invalid email addresses: ${invalid.join(', ')}`);
      }

      // Get transporter
      const transporter = this.getTransporter();

      // Prepare email options
      const mailOptions = {
        from: options.from || this.getDefaultSender(),
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        attachments: options.attachments,
      };

      // Send email
      const info = await transporter.sendMail(mailOptions);

      console.log('Email sent successfully:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Failed to send email:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Queue email for asynchronous sending
   * Returns job ID instead of message ID
   */
  static async queueEmail(options: EmailOptions): Promise<SendEmailResult> {
    try {
      // Validate email addresses
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const { invalid } = MailUtils.validateEmailList(recipients);

      if (invalid.length > 0) {
        throw new ValidationError(`Invalid email addresses: ${invalid.join(', ')}`);
      }

      // Add to queue
      const jobId = await addEmailToQueue({
        ...options,
        from: options.from || this.getDefaultSender(),
      });

      console.log('Email queued successfully:', {
        jobId,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: true,
        messageId: jobId, // Return job ID as message ID
      };
    } catch (error) {
      console.error('Failed to queue email:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Queue urgent email (high priority)
   * Used for OTP, password reset, security alerts, etc.
   */
  static async queueUrgentEmail(options: EmailOptions): Promise<SendEmailResult> {
    try {
      // Validate email addresses
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const { invalid } = MailUtils.validateEmailList(recipients);

      if (invalid.length > 0) {
        throw new ValidationError(`Invalid email addresses: ${invalid.join(', ')}`);
      }

      // Add to queue with high priority
      const jobId = await addUrgentEmailToQueue({
        ...options,
        from: options.from || this.getDefaultSender(),
      });

      console.log('Urgent email queued successfully:', {
        jobId,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: true,
        messageId: jobId, // Return job ID as message ID
      };
    } catch (error) {
      console.error('Failed to queue urgent email:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send email using template
   */
  static async sendTemplateEmail(
    template: EmailTemplate,
    to: string | string[],
    data: EmailTemplateData
  ): Promise<SendEmailResult> {
    try {
      // Get subject and render HTML
      const subject = MailUtils.getTemplateSubject(template);
      const html = MailUtils.renderTemplate(template, data);
      const text = MailUtils.htmlToPlainText(html);

      // Send email
      return await this.sendEmail({
        to,
        subject,
        html,
        text,
      });
    } catch (error) {
      console.error('Failed to send template email:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<SendEmailResult> {
    return await this.sendTemplateEmail(EmailTemplate.WELCOME, to, data);
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    to: string,
    data: PasswordResetEmailData
  ): Promise<SendEmailResult> {
    return await this.sendTemplateEmail(EmailTemplate.PASSWORD_RESET, to, data);
  }

  /**
   * Send account verification email
   */
  static async sendAccountVerificationEmail(
    to: string,
    data: AccountVerificationEmailData
  ): Promise<SendEmailResult> {
    return await this.sendTemplateEmail(EmailTemplate.ACCOUNT_VERIFICATION, to, data);
  }

  /**
   * Send loan notification email
   */
  static async sendLoanNotificationEmail(
    to: string,
    data: LoanNotificationEmailData
  ): Promise<SendEmailResult> {
    return await this.sendTemplateEmail(EmailTemplate.LOAN_NOTIFICATION, to, data);
  }

  /**
   * Send loan reminder email
   */
  static async sendLoanReminderEmail(
    to: string,
    data: LoanReminderEmailData
  ): Promise<SendEmailResult> {
    return await this.sendTemplateEmail(EmailTemplate.LOAN_REMINDER, to, data);
  }

  /**
   * Send loan overdue email
   */
  static async sendLoanOverdueEmail(
    to: string,
    data: LoanOverdueEmailData
  ): Promise<SendEmailResult> {
    return await this.sendTemplateEmail(EmailTemplate.LOAN_OVERDUE, to, data);
  }

  /**
   * Queue bulk loan reminder emails
   * Sends the same reminder email to multiple users
   */
  static async queueBulkLoanReminderEmails(
    users: { email: string; fullName: string }[],
    daysUntilDue: number,
    dashboardUrl: string
  ): Promise<{ success: boolean; queuedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let queuedCount = 0;

    // Get subject and render template for each user
    const subject = MailUtils.getTemplateSubject(EmailTemplate.BULK_LOAN_REMINDER);

    for (const user of users) {
      try {
        const data: BulkLoanReminderEmailData = {
          fullName: user.fullName,
          daysUntilDue,
          dashboardUrl,
        };

        const html = MailUtils.renderTemplate(EmailTemplate.BULK_LOAN_REMINDER, data);
        const text = MailUtils.htmlToPlainText(html);

        const result = await this.queueEmail({
          to: user.email,
          subject,
          html,
          text,
        });

        if (result.success) {
          queuedCount++;
        } else {
          errors.push(`Failed to queue email for ${user.email}: ${result.error}`);
        }
      } catch (error) {
        errors.push(
          `Error queuing email for ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      success: errors.length === 0,
      queuedCount,
      errors,
    };
  }

  /**
   * Send reservation confirmation email
   */
  static async sendReservationConfirmationEmail(
    to: string,
    data: ReservationConfirmationEmailData
  ): Promise<SendEmailResult> {
    return await this.sendTemplateEmail(EmailTemplate.RESERVATION_CONFIRMATION, to, data);
  }

  /**
   * Send reservation ready email
   */
  static async sendReservationReadyEmail(
    to: string,
    data: ReservationReadyEmailData
  ): Promise<SendEmailResult> {
    return await this.sendTemplateEmail(EmailTemplate.RESERVATION_READY, to, data);
  }

  /**
   * Send account status change email
   */
  static async sendAccountStatusChangeEmail(
    to: string,
    data: AccountStatusChangeEmailData
  ): Promise<SendEmailResult> {
    return await this.sendTemplateEmail(EmailTemplate.ACCOUNT_STATUS_CHANGE, to, data);
  }

  /**
   * Send bulk emails with optional delay between emails
   */
  static async sendBulkEmails(
    emails: { to: string; subject: string; html: string; text?: string }[],
    delayBetweenEmails: number = 100
  ): Promise<SendEmailResult[]> {
    const results: SendEmailResult[] = [];

    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);

      // Add delay between emails
      if (delayBetweenEmails > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
      }
    }

    return results;
  }

  /**
   * Verify email configuration
   */
  static async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log('Email server connection verified successfully');
      return true;
    } catch (error) {
      console.error('Email server connection verification failed:', error);
      return false;
    }
  }

  /**
   * Send OTP code via email (queued with high priority)
   * @param to - Recipient email address
   * @param otpCode - The OTP code to send
   * @param otpType - Type of OTP (for email title)
   * @param expiryMinutes - Minutes until OTP expires
   */
  static async sendOTPCodeEmail(
    to: string,
    otpCode: string,
    otpType: string,
    expiryMinutes: number
  ): Promise<SendEmailResult> {
    // Get OTP email template from MailUtils
    const { html, text } = MailUtils.renderOTPCodeEmail(otpCode, otpType, expiryMinutes);

    // Queue email with high priority for fast delivery
    return await this.queueUrgentEmail({
      to,
      subject: `${otpType} - OTP Code`,
      html,
      text,
    });
  }

  /**
   * Create test account for development (using Ethereal)
   */
  static async createTestAccount(): Promise<{
    user: string;
    pass: string;
    smtp: { host: string; port: number; secure: boolean };
    web: string;
  }> {
    const testAccount = await nodemailer.createTestAccount();
    return {
      user: testAccount.user,
      pass: testAccount.pass,
      smtp: testAccount.smtp,
      web: testAccount.web,
    };
  }
}
