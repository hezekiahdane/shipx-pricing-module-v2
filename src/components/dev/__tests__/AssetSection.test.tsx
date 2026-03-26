import { describe, expect, it } from 'vitest';
import { render } from '@/test/utils';
import { AssetSection } from '../sections/AssetSection';

// AssetSection is a no-prop stub until Task 10 wires DOM scan + context.
// It renders null until assets are available via context.
describe('AssetSection', () => {
  it('renders nothing when no assets are available (stub state)', () => {
    const { container } = render(<AssetSection />);
    expect(container.firstChild).toBeNull();
  });
});
