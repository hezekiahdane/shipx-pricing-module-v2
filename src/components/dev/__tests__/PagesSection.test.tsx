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

  it('renders pages from discoveredPages context (label + path visible)', () => {
    render(<PagesSection />, {
      devPanelValue: { discoveredPages: pages, blockedPages: [] },
    });
    expect(screen.getByText('Homepage')).toBeDefined();
    expect(screen.getByText('About')).toBeDefined();
    expect(screen.getByText('Careers')).toBeDefined();
    expect(screen.getByText('/')).toBeDefined();
    expect(screen.getByText('/about')).toBeDefined();
    expect(screen.getByText('/careers')).toBeDefined();
  });

  it('renders a lock button for each page', () => {
    render(<PagesSection />, {
      devPanelValue: { discoveredPages: pages, blockedPages: [] },
    });
    const blockButtons = screen.getAllByRole('button', { name: /block/i });
    expect(blockButtons).toHaveLength(pages.length);
  });

  it('clicking lock button calls setPageBlocked(path, true) when page is not blocked', () => {
    const setPageBlocked = vi.fn();
    render(<PagesSection />, {
      devPanelValue: {
        discoveredPages: pages,
        blockedPages: [],
        setPageBlocked,
      },
    });
    const blockAboutBtn = screen.getByRole('button', {
      name: 'Block /about',
    });
    fireEvent.click(blockAboutBtn);
    expect(setPageBlocked).toHaveBeenCalledWith('/about', true);
  });

  it('clicking lock button calls setPageBlocked(path, false) when page is already blocked', () => {
    const setPageBlocked = vi.fn();
    render(<PagesSection />, {
      devPanelValue: {
        discoveredPages: pages,
        blockedPages: ['/about'],
        setPageBlocked,
      },
    });
    const unblockAboutBtn = screen.getByRole('button', {
      name: 'Unblock /about',
    });
    fireEvent.click(unblockAboutBtn);
    expect(setPageBlocked).toHaveBeenCalledWith('/about', false);
  });

  it('blocked page row has dimmed appearance (opacity-50)', () => {
    render(<PagesSection />, {
      devPanelValue: {
        discoveredPages: pages,
        blockedPages: ['/about'],
      },
    });
    const aboutLabel = screen.getByText('About');
    // Walk up to the row container which should have opacity-50
    const row = aboutLabel.closest('[data-testid="page-row"]');
    expect(row?.className).toContain('opacity-50');
  });

  it('unblocked page row does NOT have dimmed appearance', () => {
    render(<PagesSection />, {
      devPanelValue: {
        discoveredPages: pages,
        blockedPages: ['/about'],
      },
    });
    const homepageLabel = screen.getByText('Homepage');
    const row = homepageLabel.closest('[data-testid="page-row"]');
    expect(row?.className).not.toContain('opacity-50');
  });

  it('renders correct status badge for each page', () => {
    render(<PagesSection />, {
      devPanelValue: { discoveredPages: pages, blockedPages: [] },
    });
    expect(screen.getByText('ACTIVE')).toBeDefined();
    expect(screen.getByText('DONE')).toBeDefined();
    expect(screen.getByText('WIP')).toBeDefined();
  });

  it('clicking page label calls router.push with correct localized path', () => {
    const mockPush = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: test mock typecasting
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    render(<PagesSection />, {
      devPanelValue: { discoveredPages: pages, blockedPages: [] },
    });
    fireEvent.click(screen.getByText('About'));
    expect(mockPush).toHaveBeenCalledWith('/en/about');
  });
});
