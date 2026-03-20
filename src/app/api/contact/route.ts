import { successResponse } from '@/lib/core/api/response';
import { withApi } from '@/lib/core/api/with-api';
import { sendContactEmails } from '@/lib/email/service';
import { contactSchema } from '@/lib/validators/contact.schema';

export const POST = withApi(
  {
    schema: contactSchema,
    rateLimit: 'contact',
    csrf: true,
  },
  async ({ data }) => {
    const result = await sendContactEmails(data);

    if (!result.success) {
      throw new Error('Failed to send message');
    }

    return successResponse(null);
  },
);
