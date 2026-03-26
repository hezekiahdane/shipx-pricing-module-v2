import { fireEvent } from '@testing-library/react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import type { DevPanelPage } from '../index';
import { PagesSection } from '../sections/PagesSection';

// Hoist mock — vi.mock is hoisted to top of file by Vitest
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useParams: vi.fn(),
}));

const pages: DevPanelPage[] = [
  { label: 'Homepage', path: '/', status: 'active' },
  { label: 'About', path: '/about', status: 'done' },
  { label: 'Careers', path: '/careers', status: 'wip' },
];

describe('PagesSection', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/en');
    // biome-ignore lint/suspicious/noExplicitAny: test mock typecasting
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as any);
    // biome-ignore lint/suspicious/noExplicitAny: test mock typecasting
    vi.mocked(useParams).mockReturnValue({ locale: 'en' } as any);
  });

  it('renders all pages from config', () => {
    render(<PagesSection pages={pages} />);
    expect(screen.getByText('Homepage')).toBeDefined();
    expect(screen.getByText('About')).toBeDefined();
    expect(screen.getByText('Careers')).toBeDefined();
  });

  it('renders correct status badge for each page', () => {
    render(<PagesSection pages={pages} />);
    expect(screen.getByText('ACTIVE')).toBeDefined();
    expect(screen.getByText('DONE')).toBeDefined();
    expect(screen.getByText('WIP')).toBeDefined();
  });

  it('calls router.push with correct path on page click', () => {
    const mockPush = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: test mock typecasting
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    render(<PagesSection pages={pages} />);
    fireEvent.click(screen.getByText('About'));
    expect(mockPush).toHaveBeenCalledWith('/en/about');
  });
});
