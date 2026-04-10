/**
 * Mail Utilities
 * Utilities for email functionality including template rendering
 */

import {
  AccountStatusChangeEmailData,
  AccountVerificationEmailData,
  BulkLoanReminderEmailData,
  EmailTemplate,
  EmailTemplateData,
  LoanNotificationEmailData,
  LoanOverdueEmailData,
  LoanReminderEmailData,
  PasswordResetEmailData,
  ReservationConfirmationEmailData,
  ReservationReadyEmailData,
  WelcomeEmailData,
} from '@/types/mail';

export class MailUtils {
  /**
   * Get email subject for a template
   */
  static getTemplateSubject(template: EmailTemplate): string {
    const subjects: Record<EmailTemplate, string> = {
      [EmailTemplate.WELCOME]: 'Welcome to Library Management System',
      [EmailTemplate.PASSWORD_RESET]: 'Reset Your Password',
      [EmailTemplate.ACCOUNT_VERIFICATION]: 'Verify Your Account',
      [EmailTemplate.LOAN_NOTIFICATION]: 'Book Loan Confirmation',
      [EmailTemplate.LOAN_REMINDER]: 'Book Return Reminder',
      [EmailTemplate.LOAN_OVERDUE]: 'Overdue Book Notice',
      [EmailTemplate.BULK_LOAN_REMINDER]: 'Book Return Reminder - Action Required',
      [EmailTemplate.RESERVATION_CONFIRMATION]: 'Book Reservation Confirmation',
      [EmailTemplate.RESERVATION_READY]: 'Your Reserved Book is Ready',
      [EmailTemplate.ACCOUNT_STATUS_CHANGE]: 'Account Status Update',
    };

    return subjects[template];
  }

  /**
   * Render email template to HTML
   */
  static renderTemplate(template: EmailTemplate, data: EmailTemplateData): string {
    switch (template) {
      case EmailTemplate.WELCOME:
        return this.renderWelcomeEmail(data as WelcomeEmailData);
      case EmailTemplate.PASSWORD_RESET:
        return this.renderPasswordResetEmail(data as PasswordResetEmailData);
      case EmailTemplate.ACCOUNT_VERIFICATION:
        return this.renderAccountVerificationEmail(data as AccountVerificationEmailData);
      case EmailTemplate.LOAN_NOTIFICATION:
        return this.renderLoanNotificationEmail(data as LoanNotificationEmailData);
      case EmailTemplate.LOAN_REMINDER:
        return this.renderLoanReminderEmail(data as LoanReminderEmailData);
      case EmailTemplate.LOAN_OVERDUE:
        return this.renderLoanOverdueEmail(data as LoanOverdueEmailData);
      case EmailTemplate.BULK_LOAN_REMINDER:
        return this.renderBulkLoanReminderEmail(data as BulkLoanReminderEmailData);
      case EmailTemplate.RESERVATION_CONFIRMATION:
        return this.renderReservationConfirmationEmail(data as ReservationConfirmationEmailData);
      case EmailTemplate.RESERVATION_READY:
        return this.renderReservationReadyEmail(data as ReservationReadyEmailData);
      case EmailTemplate.ACCOUNT_STATUS_CHANGE:
        return this.renderAccountStatusChangeEmail(data as AccountStatusChangeEmailData);
      default:
        throw new Error(`Unknown email template: ${template}`);
    }
  }

  /**
   * Base email layout wrapper
   */
  private static wrapEmailLayout(content: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Library Management System</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f7f6f4;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #ff7b42;
      margin-bottom: 30px;
    }
    .email-logo {
      font-size: 28px;
      font-weight: bold;
      color: #ff7b42;
      margin-bottom: 10px;
    }
    .email-body {
      color: #333;
      font-size: 16px;
      line-height: 1.8;
    }
    .email-body h1 {
      color: #ff7b42;
      font-size: 24px;
      margin-bottom: 20px;
    }
    .email-body p {
      margin-bottom: 15px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #ff7b42;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #e66a32;
    }
    .info-box {
      background-color: #f7f6f4;
      border-left: 4px solid #ff7b42;
      padding: 15px;
      margin: 20px 0;
    }
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .danger-box {
      background-color: #f8d7da;
      border-left: 4px solid #dc3545;
      padding: 15px;
      margin: 20px 0;
    }
    .email-footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e4e4e7;
      color: #666;
      font-size: 14px;
    }
    .book-details {
      background-color: #f7f6f4;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .book-details h3 {
      color: #ff7b42;
      margin-top: 0;
      margin-bottom: 10px;
    }
    .book-details p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="email-logo">📚 Library Management System</div>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p>This is an automated message from Library Management System.</p>
      <p>Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Library Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Welcome email template
   */
  private static renderWelcomeEmail(data: WelcomeEmailData): string {
    const content = `
      <h1>Welcome, ${data.fullName}! 🎉</h1>
      <p>Thank you for registering with our Library Management System. We're excited to have you as a member!</p>
      
      <p>Your account has been successfully created with the email: <strong>${data.email}</strong></p>
      
      <p>You can now:</p>
      <ul>
        <li>Browse our extensive collection of books</li>
        <li>Borrow books online</li>
        <li>Reserve popular titles</li>
        <li>Track your reading history</li>
        <li>Write and read reviews</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="${data.loginUrl}" class="button">Get Started</a>
      </div>
      
      <p>If you have any questions, feel free to reach out to our support team.</p>
      
      <p>Happy reading!</p>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Password reset email template
   */
  private static renderPasswordResetEmail(data: PasswordResetEmailData): string {
    const content = `
      <h1>Password Reset Request</h1>
      <p>Hello ${data.fullName},</p>
      
      <p>We received a request to reset your password for your Library Management System account.</p>
      
      <div class="info-box">
        <p><strong>If you requested this reset:</strong></p>
        <p>Click the button below to create a new password. This link will expire in ${data.expiresIn}.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.resetUrl}" class="button">Reset Password</a>
      </div>
      
      <div class="warning-box">
        <p><strong>If you didn't request this:</strong></p>
        <p>You can safely ignore this email. Your password will remain unchanged.</p>
      </div>
      
      <p>For security reasons, never share your password reset link with anyone.</p>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Account verification email template
   */
  private static renderAccountVerificationEmail(data: AccountVerificationEmailData): string {
    const content = `
      <h1>Verify Your Account</h1>
      <p>Hello ${data.fullName},</p>
      
      <p>Thank you for registering with Library Management System. To complete your registration, please verify your email address.</p>
      
      <div style="text-align: center;">
        <a href="${data.verificationUrl}" class="button">Verify Email</a>
      </div>
      
      <div class="info-box">
        <p>This verification link will expire in ${data.expiresIn}.</p>
      </div>
      
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Loan notification email template
   */
  private static renderLoanNotificationEmail(data: LoanNotificationEmailData): string {
    const content = `
      <h1>Book Loan Confirmation ✅</h1>
      <p>Hello ${data.fullName},</p>
      
      <p>Your book loan has been confirmed!</p>
      
      <div class="book-details">
        <h3>Book Details</h3>
        <p><strong>Title:</strong> ${data.bookTitle}</p>
        <p><strong>Author:</strong> ${data.author}</p>
        <p><strong>Due Date:</strong> ${data.dueDate}</p>
      </div>
      
      <div class="info-box">
        <p><strong>Important:</strong> Please return the book by the due date to avoid late fees.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.returnUrl}" class="button">View Loan Details</a>
      </div>
      
      <p>Enjoy your reading!</p>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Loan reminder email template
   */
  private static renderLoanReminderEmail(data: LoanReminderEmailData): string {
    const content = `
      <h1>Book Return Reminder ⏰</h1>
      <p>Hello ${data.fullName},</p>
      
      <p>This is a friendly reminder that your borrowed book is due soon.</p>
      
      <div class="book-details">
        <h3>Book Details</h3>
        <p><strong>Title:</strong> ${data.bookTitle}</p>
        <p><strong>Author:</strong> ${data.author}</p>
        <p><strong>Due Date:</strong> ${data.dueDate}</p>
        <p><strong>Days Until Due:</strong> ${data.daysUntilDue} ${data.daysUntilDue === 1 ? 'day' : 'days'}</p>
      </div>
      
      <p>Please return the book by the due date or renew your loan to avoid late fees.</p>
      
      <div style="text-align: center;">
        <a href="${data.renewUrl}" class="button">Renew Loan</a>
      </div>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Loan overdue email template
   */
  private static renderLoanOverdueEmail(data: LoanOverdueEmailData): string {
    const content = `
      <h1>Overdue Book Notice ⚠️</h1>
      <p>Hello ${data.fullName},</p>
      
      <div class="danger-box">
        <p><strong>URGENT:</strong> Your borrowed book is overdue!</p>
      </div>
      
      <div class="book-details">
        <h3>Book Details</h3>
        <p><strong>Title:</strong> ${data.bookTitle}</p>
        <p><strong>Author:</strong> ${data.author}</p>
        <p><strong>Due Date:</strong> ${data.dueDate}</p>
        <p><strong>Days Overdue:</strong> ${data.daysOverdue} ${data.daysOverdue === 1 ? 'day' : 'days'}</p>
        ${data.fineAmount ? `<p><strong>Current Fine:</strong> $${data.fineAmount.toFixed(2)}</p>` : ''}
      </div>
      
      <p>Please return the book as soon as possible to minimize late fees and allow other patrons to access it.</p>
      
      <p>If you have any questions or concerns, please contact the library immediately.</p>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Bulk loan reminder email template (generic reminder without specific book details)
   */
  private static renderBulkLoanReminderEmail(data: BulkLoanReminderEmailData): string {
    const content = `
      <h1>Book Return Reminder ⏰</h1>
      <p>Hello ${data.fullName},</p>
      
      <p>This is a friendly reminder that you have books due for return soon.</p>
      
      <div class="warning-box">
        <p><strong>⏰ Time Remaining:</strong> ${data.daysUntilDue} ${data.daysUntilDue === 1 ? 'day' : 'days'} until due date</p>
      </div>
      
      <p>Please prepare to return your books on time to avoid penalties.</p>
      
      <div class="info-box">
        <p>You can check your borrowed books and return dates in your account dashboard.</p>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">View My Borrowed Books</a>
      </div>
      
      <p>Thank you for being a valued member of our library!</p>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Reservation confirmation email template
   */
  private static renderReservationConfirmationEmail(
    data: ReservationConfirmationEmailData
  ): string {
    const content = `
      <h1>Reservation Confirmed 📖</h1>
      <p>Hello ${data.fullName},</p>
      
      <p>Your book reservation has been confirmed!</p>
      
      <div class="book-details">
        <h3>Book Details</h3>
        <p><strong>Title:</strong> ${data.bookTitle}</p>
        <p><strong>Author:</strong> ${data.author}</p>
        <p><strong>Reservation Date:</strong> ${data.reservationDate}</p>
        <p><strong>Expected Availability:</strong> ${data.expectedDate}</p>
      </div>
      
      <div class="info-box">
        <p>We'll notify you as soon as the book becomes available for pickup.</p>
      </div>
      
      <p>Thank you for your patience!</p>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Reservation ready email template
   */
  private static renderReservationReadyEmail(data: ReservationReadyEmailData): string {
    const content = `
      <h1>Your Book is Ready! 🎉</h1>
      <p>Hello ${data.fullName},</p>
      
      <p>Great news! Your reserved book is now ready for pickup.</p>
      
      <div class="book-details">
        <h3>Book Details</h3>
        <p><strong>Title:</strong> ${data.bookTitle}</p>
        <p><strong>Author:</strong> ${data.author}</p>
        <p><strong>Pickup Location:</strong> ${data.pickupLocation}</p>
        <p><strong>Pickup Deadline:</strong> ${data.pickupDeadline}</p>
      </div>
      
      <div class="warning-box">
        <p><strong>Important:</strong> Please pick up your book by the deadline or your reservation will be cancelled.</p>
      </div>
      
      <p>We look forward to seeing you at the library!</p>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Account status change email template
   */
  private static renderAccountStatusChangeEmail(data: AccountStatusChangeEmailData): string {
    const statusColors: Record<string, string> = {
      active: '#28a745',
      suspended: '#ffc107',
      banned: '#dc3545',
    };

    const statusColor = statusColors[data.status.toLowerCase()] || '#333';

    const content = `
      <h1>Account Status Update</h1>
      <p>Hello ${data.fullName},</p>
      
      <p>Your account status has been changed.</p>
      
      <div class="info-box">
        <p><strong>New Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${data.status.toUpperCase()}</span></p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
      </div>
      
      <p>If you have any questions or concerns about this change, please contact us at <a href="mailto:${data.contactEmail}">${data.contactEmail}</a></p>
    `;

    return this.wrapEmailLayout(content);
  }

  /**
   * Generate plain text version from HTML
   */
  static htmlToPlainText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate email address format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate multiple email addresses
   */
  static validateEmailList(emails: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const email of emails) {
      if (this.isValidEmail(email.trim())) {
        valid.push(email.trim());
      } else {
        invalid.push(email.trim());
      }
    }

    return { valid, invalid };
  }

  /**
   * Render OTP code email template
   * @param otpCode - The OTP code to display
   * @param otpType - Type of OTP (for email title)
   * @param expiryMinutes - Minutes until OTP expires
   */
  static renderOTPCodeEmail(
    otpCode: string,
    otpType: string,
    expiryMinutes: number
  ): { html: string; text: string } {
    const content = `
      <h1>${otpType}</h1>
      <p>Hello,</p>
      
      <p>You have requested a verification code for <strong>${otpType}</strong>.</p>
      
      <p>Your OTP code is:</p>
      
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; color: #ff7b42; padding: 25px; background: #f7f6f4; border-radius: 8px; margin: 25px 0; border: 2px dashed #ff7b42;">
        ${otpCode}
      </div>
      
      <div class="warning-box">
        <p><strong>This code will expire in ${expiryMinutes} minutes.</strong></p>
      </div>
      
      <div class="danger-box">
        <p><strong>⚠️ Security Notice:</strong></p>
        <p>Do not share this code with anyone. Our staff will never ask for your OTP code.</p>
      </div>
      
      <p>If you did not request this code, please ignore this email or contact support if you have concerns.</p>
    `;

    const html = this.wrapEmailLayout(content);

    const text = `
      ${otpType}

      Hello,

      You have requested a verification code for ${otpType}.

      Your OTP code is: ${otpCode}

      This code will expire in ${expiryMinutes} minutes.

      SECURITY NOTICE:
      Do not share this code with anyone. Our staff will never ask for your OTP code.

      If you did not request this code, please ignore this email or contact support.

      © ${new Date().getFullYear()} Library Management System
    `.trim();

    return { html, text };
  }
}
