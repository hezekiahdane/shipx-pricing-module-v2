import { describe, expect, it } from 'vitest';
import { contactSchema } from '../contact.schema';

const validPayload = {
  name: 'John Doe',
  company: 'Acme Corp',
  email: 'john@example.com',
  phone: '1234567',
  businessType: 'Bank' as const,
  message: 'This is a test message with enough chars',
};

describe('contactSchema', () => {
  it('accepts a valid payload', () => {
    const result = contactSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts a payload without message (optional)', () => {
    const { message: _message, ...rest } = validPayload;
    const result = contactSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = contactSchema.safeParse({ ...validPayload, name: 'a' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a short phone number', () => {
    const result = contactSchema.safeParse({ ...validPayload, phone: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid businessType', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      businessType: 'Unknown',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a message that is too short', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      message: 'short',
    });
    expect(result.success).toBe(false);
  });
});
