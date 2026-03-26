import { fireEvent, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@/test/utils';
import { AssetSection } from '../sections/AssetSection';

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/') }));

type MockNodeList = NodeListOf<Element>;

function toNodeList<T>(arr: T[]): MockNodeList {
  return arr as unknown as MockNodeList;
}

describe('AssetSection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows "No assets detected" when DOM has no media', async () => {
    vi.spyOn(document, 'querySelectorAll').mockReturnValue(toNodeList([]));
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    expect(screen.getByText(/no assets detected/i)).toBeDefined();
  });

  it('renders first 3 assets and show-more button when 5 images exist', async () => {
    const mockImgs = Array.from({ length: 5 }, (_, i) => ({
      alt: `Image ${i + 1}`,
      src: `http://localhost/img${i}.png`,
      naturalWidth: 100,
      naturalHeight: 100,
    }));
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'img[src]') return toNodeList(mockImgs);
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    // First 3 visible
    expect(screen.getAllByText(/image/i)).toHaveLength(3);
    expect(screen.getByText(/show 2 more/i)).toBeDefined();
  });

  it('expands to show all assets when show-more is clicked', async () => {
    const mockImgs = Array.from({ length: 5 }, (_, i) => ({
      alt: `Image ${i + 1}`,
      src: `http://localhost/img${i}.png`,
      naturalWidth: 100,
      naturalHeight: 100,
    }));
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'img[src]') return toNodeList(mockImgs);
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    fireEvent.click(screen.getByText(/show 2 more/i));
    expect(screen.getAllByText(/image/i)).toHaveLength(5);
    expect(screen.getByText(/show less/i)).toBeDefined();
  });

  it('falls back to filename when naturalWidth is 0', async () => {
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'img[src]') {
        return toNodeList([
          {
            alt: '',
            src: 'http://localhost/hero.png',
            naturalWidth: 0,
            naturalHeight: 0,
          },
        ]);
      }
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    expect(screen.getByText('hero.png')).toBeDefined();
  });
});
