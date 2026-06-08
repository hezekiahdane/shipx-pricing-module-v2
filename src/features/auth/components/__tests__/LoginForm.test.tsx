import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the server action so LoginForm doesn't pull in next-auth at the module level
vi.mock('../actions', () => ({
  signIn: vi.fn(),
}));

// Mock @/auth to prevent the database/next-auth module chain from loading in tests
vi.mock('@/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

// vi.hoisted ensures the mock fn is available before the hoisted vi.mock factory runs
const { mockUseActionState } = vi.hoisted(() => ({
  mockUseActionState: vi.fn(),
}));

// Mock useActionState so we can control form state in tests
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useActionState: mockUseActionState };
});

import LoginForm from '../LoginForm';

beforeEach(() => {
  mockUseActionState.mockReturnValue([undefined, vi.fn(), false]);
});

describe('LoginForm', () => {
  it('renders email input, password input and submit button', () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it('shows error message when state contains an error', () => {
    mockUseActionState.mockReturnValue([
      { error: 'Invalid email or password' },
      vi.fn(),
      false,
    ]);
    render(<LoginForm />);
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });

  it('disables submit button and changes label while pending', () => {
    mockUseActionState.mockReturnValue([undefined, vi.fn(), true]);
    render(<LoginForm />);
    const btn = screen.getByRole('button', { name: /signing in/i });
    expect(btn).toBeDisabled();
  });
});
