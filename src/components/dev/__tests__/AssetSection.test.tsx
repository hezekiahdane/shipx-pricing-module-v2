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
    // hero.png should appear twice: once as label (alt fallback) and once as value
    const matches = screen.getAllByText('hero.png');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('renders video assets from video[src] elements', async () => {
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'video[src]') {
        return toNodeList([
          {
            getAttribute: (attr: string) =>
              attr === 'aria-label' ? 'Promo Video' : null,
            src: 'http://localhost/promo.mp4',
          },
        ]);
      }
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    expect(screen.getByText('Promo Video')).toBeDefined();
  });

  it('falls back to filename label for video without aria-label', async () => {
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'video[src]') {
        return toNodeList([
          {
            getAttribute: (_attr: string) => null,
            src: 'http://localhost/clip.mp4',
          },
        ]);
      }
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    // label falls back to filename from src (appears as both label and value)
    expect(screen.getAllByText('clip.mp4').length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to "video" label when video has no aria-label and no src filename', async () => {
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'video[src]') {
        return toNodeList([
          {
            getAttribute: (_attr: string) => null,
            src: '',
          },
        ]);
      }
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    expect(screen.getByText('video')).toBeDefined();
  });

  it('renders svg assets from svg[aria-label] elements', async () => {
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'svg[data-src], svg[aria-label]') {
        return toNodeList([
          {
            getAttribute: (attr: string) =>
              attr === 'aria-label' ? 'Logo' : null,
          },
        ]);
      }
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    expect(screen.getByText('Logo')).toBeDefined();
  });

  it('falls back to data-src label for svg without aria-label', async () => {
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'svg[data-src], svg[aria-label]') {
        return toNodeList([
          {
            getAttribute: (attr: string) =>
              attr === 'data-src' ? 'icon.svg' : null,
          },
        ]);
      }
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    expect(screen.getByText('icon.svg')).toBeDefined();
  });

  it('falls back to "svg" label when svg has neither aria-label nor data-src', async () => {
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'svg[data-src], svg[aria-label]') {
        return toNodeList([
          {
            getAttribute: (_attr: string) => null,
          },
        ]);
      }
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    expect(screen.getByText('svg')).toBeDefined();
  });

  it('falls back to "image" label when img has no alt and empty src', async () => {
    vi.spyOn(document, 'querySelectorAll').mockImplementation((sel: string) => {
      if (sel === 'img[src]') {
        return toNodeList([
          {
            alt: '',
            src: '',
            naturalWidth: 100,
            naturalHeight: 100,
          },
        ]);
      }
      return toNodeList([]);
    });
    render(<AssetSection />);
    await act(() => vi.runAllTimers());
    expect(screen.getByText('image')).toBeDefined();
  });

  it('collapses back to 3 items when "Show less" is clicked', async () => {
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
    // Expand
    fireEvent.click(screen.getByText(/show 2 more/i));
    expect(screen.getAllByText(/image/i)).toHaveLength(5);
    // Collapse
    fireEvent.click(screen.getByText(/show less/i));
    expect(screen.getAllByText(/image/i)).toHaveLength(3);
    expect(screen.queryByText(/show less/i)).toBeNull();
  });
});
