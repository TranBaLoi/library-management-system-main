/**
 * Mail Types
 * Types for email functionality
 */

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  encoding?: string;
}

export interface EmailTemplateData {
  [key: string]: string | number | boolean | undefined | null;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email templates
export enum EmailTemplate {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password-reset',
  ACCOUNT_VERIFICATION = 'account-verification',
  LOAN_NOTIFICATION = 'loan-notification',
  LOAN_REMINDER = 'loan-reminder',
  LOAN_OVERDUE = 'loan-overdue',
  BULK_LOAN_REMINDER = 'bulk-loan-reminder',
  RESERVATION_CONFIRMATION = 'reservation-confirmation',
  RESERVATION_READY = 'reservation-ready',
  ACCOUNT_STATUS_CHANGE = 'account-status-change',
}

// Welcome email data
export interface WelcomeEmailData extends EmailTemplateData {
  fullName: string;
  email: string;
  loginUrl: string;
}

// Password reset email data
export interface PasswordResetEmailData extends EmailTemplateData {
  fullName: string;
  resetUrl: string;
  expiresIn: string;
}

// Account verification email data
export interface AccountVerificationEmailData extends EmailTemplateData {
  fullName: string;
  verificationUrl: string;
  expiresIn: string;
}

// Loan notification email data
export interface LoanNotificationEmailData extends EmailTemplateData {
  fullName: string;
  bookTitle: string;
  author: string;
  dueDate: string;
  returnUrl: string;
}

// Loan reminder email data
export interface LoanReminderEmailData extends EmailTemplateData {
  fullName: string;
  bookTitle: string;
  author: string;
  dueDate: string;
  daysUntilDue: number;
  renewUrl: string;
}

// Loan overdue email data
export interface LoanOverdueEmailData extends EmailTemplateData {
  fullName: string;
  bookTitle: string;
  author: string;
  dueDate: string;
  daysOverdue: number;
  fineAmount?: number;
}

// Reservation confirmation email data
export interface ReservationConfirmationEmailData extends EmailTemplateData {
  fullName: string;
  bookTitle: string;
  author: string;
  reservationDate: string;
  expectedDate: string;
}

// Reservation ready email data
export interface ReservationReadyEmailData extends EmailTemplateData {
  fullName: string;
  bookTitle: string;
  author: string;
  pickupDeadline: string;
  pickupLocation: string;
}

// Account status change email data
export interface AccountStatusChangeEmailData extends EmailTemplateData {
  fullName: string;
  status: string;
  reason?: string;
  contactEmail: string;
}

// Bulk loan reminder email data (generic reminder without specific book details)
export interface BulkLoanReminderEmailData extends EmailTemplateData {
  fullName: string;
  daysUntilDue: number;
  dashboardUrl: string;
}
