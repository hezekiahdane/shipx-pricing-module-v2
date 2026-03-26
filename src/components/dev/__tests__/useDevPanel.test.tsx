import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DevPanelProvider } from '../DevPanelProvider';
import type { DevPanelConfig } from '../index';
import { useDevPanel } from '../useDevPanel';

const config: DevPanelConfig = {
  projectName: 'Test',
  pages: [],
};

describe('useDevPanel', () => {
  it('returns defaultDevPanelState when called outside provider', () => {
    const { result } = renderHook(() => useDevPanel());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.togglePanel).toBeInstanceOf(Function);
    expect(() => result.current.togglePanel()).not.toThrow();
  });

  it('returns live context when called inside provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DevPanelProvider config={config}>{children}</DevPanelProvider>
    );
    const { result } = renderHook(() => useDevPanel(), { wrapper });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.config.projectName).toBe('Test');
  });
});
