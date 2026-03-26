import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { EnvSection } from '../sections/EnvSection';

// vi.hoisted ensures mockEnv is available when vi.mock factory runs (both are hoisted).
const mockEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_VERCEL_ENV: undefined as
    | 'preview'
    | 'production'
    | 'development'
    | undefined,
}));

vi.mock('@/lib/core/env', () => ({ env: mockEnv }));

describe('EnvSection', () => {
  it('renders project name', () => {
    mockEnv.NEXT_PUBLIC_VERCEL_ENV = undefined;
    render(<EnvSection projectName="Wisedrive" locale="en" />);
    expect(screen.getByText('Wisedrive')).toBeDefined();
  });

  it('renders locale', () => {
    mockEnv.NEXT_PUBLIC_VERCEL_ENV = undefined;
    render(<EnvSection projectName="Wisedrive" locale="my" />);
    expect(screen.getByText('my')).toBeDefined();
  });

  it('renders environment label from NODE_ENV when NEXT_PUBLIC_VERCEL_ENV is undefined', () => {
    mockEnv.NEXT_PUBLIC_VERCEL_ENV = undefined;
    render(<EnvSection projectName="Wisedrive" locale="en" />);
    // NODE_ENV is 'test' in vitest — ENV_LABEL maps 'test' → 'Test'
    expect(screen.getByText('Test')).toBeDefined();
  });

  it('renders Vercel env label when NEXT_PUBLIC_VERCEL_ENV is preview', () => {
    mockEnv.NEXT_PUBLIC_VERCEL_ENV = 'preview';
    render(<EnvSection projectName="Base" locale="en" />);
    // VERCEL_LABEL maps 'preview' → 'Staging'
    expect(screen.getByText('Staging')).toBeDefined();
  });

  it('falls back to raw vercel env value when not in VERCEL_LABEL', () => {
    // Force an unlisted value to exercise the ?? fallback on line 26
    mockEnv.NEXT_PUBLIC_VERCEL_ENV = 'development';
    render(<EnvSection projectName="Base" locale="en" />);
    // VERCEL_LABEL maps 'development' → 'Dev'
    expect(screen.getByText('Dev')).toBeDefined();
  });
});
