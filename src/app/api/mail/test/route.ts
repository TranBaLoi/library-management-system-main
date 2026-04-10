/**
 * Mail Test API Route
 * Test endpoint for verifying email configuration and sending test emails
 * For development/testing purposes only
 */

import { handleRouteError, successResponse } from '@/lib/utils';
import { requireAdmin } from '@/middleware/auth.middleware';
import { MailService } from '@/services';

/**
 * GET /api/mail/test
 * Verify email configuration
 * Protected: Admin only
 */
export const GET = requireAdmin(async () => {
  try {
    const isValid = await MailService.verifyConnection();

    if (isValid) {
      return successResponse({ configured: true }, 'Email configuration is valid', 200);
    } else {
      return successResponse(
        { configured: false },
        'Email configuration is invalid. Please check your environment variables.',
        500
      );
    }
  } catch (error) {
    return handleRouteError(error, 'GET /api/mail/test');
  }
});

/**
 * POST /api/mail/test
 * Send a test email
 * Protected: Admin only
 *
 * Body:
 * {
 *   "to": "recipient@example.com",
 *   "type": "welcome" | "password-reset" | "custom"
 * }
 */
export const POST = requireAdmin(async request => {
  try {
    const body = await request.json();
    const { to, type = 'custom' } = body;

    if (!to) {
      return successResponse(null, 'Recipient email is required', 400);
    }

    let result;

    switch (type) {
      case 'welcome':
        result = await MailService.sendWelcomeEmail(to, {
          fullName: 'Test User',
          email: to,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
        });
        break;

      case 'password-reset':
        result = await MailService.sendPasswordResetEmail(to, {
          fullName: 'Test User',
          resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=test123`,
          expiresIn: '1 hour',
        });
        break;

      case 'loan-notification':
        result = await MailService.sendLoanNotificationEmail(to, {
          fullName: 'Test User',
          bookTitle: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/loans/123`,
        });
        break;

      case 'custom':
      default:
        result = await MailService.sendEmail({
          to,
          subject: 'Test Email from Library Management System',
          html: `
            <h1>Test Email</h1>
            <p>This is a test email sent from the Library Management System.</p>
            <p>If you received this email, your email configuration is working correctly!</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          `,
          text: 'This is a test email from the Library Management System. Your email configuration is working!',
        });
        break;
    }

    if (result.success) {
      return successResponse(
        {
          messageId: result.messageId,
          to,
          type,
        },
        'Test email sent successfully',
        200
      );
    } else {
      return successResponse({ error: result.error }, 'Failed to send test email', 500);
    }
  } catch (error) {
    return handleRouteError(error, 'POST /api/mail/test');
  }
});
