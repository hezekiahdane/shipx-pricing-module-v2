import { AuthError } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const mockAuthSignIn = vi.fn();
vi.mock('@/auth', () => ({
  signIn: mockAuthSignIn,
}));

const { signIn } = await import('../actions');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signIn', () => {
  it('calls authSignIn with credentials and redirectTo', async () => {
    mockAuthSignIn.mockResolvedValue(undefined);
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'secret');

    await signIn(undefined, fd);

    expect(mockAuthSignIn).toHaveBeenCalledWith('credentials', {
      email: 'user@example.com',
      password: 'secret',
      redirectTo: '/',
    });
  });

  it('returns error object when AuthError is thrown', async () => {
    mockAuthSignIn.mockRejectedValue(new AuthError('CredentialsSignin'));
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'wrong');

    const result = await signIn(undefined, fd);

    expect(result).toEqual({ error: 'Invalid email or password' });
  });

  it('rethrows non-AuthError errors (e.g. Next.js redirect)', async () => {
    const redirectError = new Error('NEXT_REDIRECT');
    mockAuthSignIn.mockRejectedValue(redirectError);
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'secret');

    await expect(signIn(undefined, fd)).rejects.toThrow('NEXT_REDIRECT');
  });
});
