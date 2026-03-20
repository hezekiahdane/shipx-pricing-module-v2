/**
 * MSW request handlers — mock external APIs in unit/integration tests.
 * Add handlers here to intercept network requests without hitting real APIs.
 *
 * Example:
 *   http.post('https://api.resend.com/emails', () => {
 *     return HttpResponse.json({ id: 'test-email-id' });
 *   })
 */

import { HttpResponse, http } from 'msw';

export const handlers = [
  // Mock Resend email API
  http.post('https://api.resend.com/emails', () => {
    return HttpResponse.json({ id: 'mock-email-id' }, { status: 200 });
  }),
];
