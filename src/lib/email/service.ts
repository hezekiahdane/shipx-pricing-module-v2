/**
 * Email service — typed wrappers around the Resend API.
 *
 * All templates use React Email, which escapes values by default.
 * Never build email HTML via string interpolation.
 */

import { render } from '@react-email/render';
import { env } from '@/lib/core/env';
import { resend } from '@/lib/email/client';
import { ContactAdminEmail } from '@/lib/email/templates/contact-admin';
import { ContactConfirmationEmail } from '@/lib/email/templates/contact-confirmation';
import type { ContactFormData } from '@/lib/validators/contact.schema';

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendContactEmails(
  data: ContactFormData,
): Promise<EmailResult> {
  if (!resend) {
    return { success: false, error: 'Email service not configured' };
  }

  const fromEmail = env.RESEND_FROM_EMAIL;
  const adminEmail = env.RESEND_ADMIN_EMAIL;

  if (!fromEmail || !adminEmail) {
    return { success: false, error: 'Email configuration is missing' };
  }

  try {
    const [adminHtml, userHtml] = await Promise.all([
      render(ContactAdminEmail({ data })),
      render(ContactConfirmationEmail({ name: data.name })),
    ]);

    // Send both emails in parallel
    const [adminResult, userResult] = await Promise.allSettled([
      resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        subject: `New contact request from ${data.name}`,
        html: adminHtml,
      }),
      resend.emails.send({
        from: fromEmail,
        to: [data.email],
        subject: `We received your message`,
        html: userHtml,
      }),
    ]);

    if (adminResult.status === 'rejected') {
    }

    if (userResult.status === 'rejected') {
    }

    // Consider the operation successful if the admin email was sent
    if (adminResult.status === 'fulfilled' && adminResult.value.data) {
      return { success: true, id: adminResult.value.data.id };
    }

    return { success: false, error: 'Failed to send email' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
