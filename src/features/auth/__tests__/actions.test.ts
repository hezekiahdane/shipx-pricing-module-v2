import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/auth/clients/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  }),
}));

const { redirect } = await import('next/navigation');
const { signIn, signOut } = await import('../actions');

beforeEach(() => {
  vi.clearAllMocks();
  mockSignOut.mockResolvedValue({});
});

describe('signIn', () => {
  it('calls signInWithPassword with form data values', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'secret');

    await signIn(undefined, fd);

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret',
    });
  });

  it('redirects to / on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'secret');

    await signIn(undefined, fd);

    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('returns error object on invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const fd = new FormData();
    fd.set('email', 'user@example.com');
    fd.set('password', 'wrong');

    const result = await signIn(undefined, fd);

    expect(result).toEqual({ error: 'Invalid email or password' });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('calls supabase signOut and redirects to /login', async () => {
    await signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
