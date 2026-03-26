import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { devPanelConfig } from '@/config/dev-panel.config';
import { DevPanelProvider } from '../DevPanelProvider';
import { useDevPanel } from '../useDevPanel';
import { useSimulatedState } from '../useSimulatedState';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <DevPanelProvider config={devPanelConfig}>{children}</DevPanelProvider>
  );
}

describe('useSimulatedState', () => {
  it('returns defaultState when called outside provider', () => {
    const { result } = renderHook(() =>
      useSimulatedState('x', 'X', ['idle'], 'idle'),
    );
    expect(result.current).toBe('idle');
  });

  it('registers simulator in panel on mount', () => {
    // Both hooks MUST share a single React tree — two separate renderHook calls
    // each create their own DevPanelProvider instance with isolated state.
    const { result } = renderHook(
      () => ({
        sim: useSimulatedState(
          'test-form',
          'Test Form',
          ['idle', 'error'],
          'idle',
        ),
        ctx: useDevPanel(),
      }),
      { wrapper },
    );
    expect(result.current.ctx.registeredSimulators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'test-form', label: 'Test Form' }),
      ]),
    );
  });

  it('returns simulated state when set via context', () => {
    const { result } = renderHook(
      () => ({
        sim: useSimulatedState(
          'test-form',
          'Test Form',
          ['idle', 'error'],
          'idle',
        ),
        ctx: useDevPanel(),
      }),
      { wrapper },
    );
    act(() => {
      result.current.ctx.setSimulatedState('test-form', 'error');
    });
    expect(result.current.sim).toBe('error');
  });

  it('unregisters on unmount', () => {
    // Unmounting requires a single React tree where the simulator consumer can
    // be conditionally removed while the context reader stays mounted.
    let setMounted: (v: boolean) => void = () => {};

    function SimUser() {
      useSimulatedState('test-form', 'Test Form', ['idle'], 'idle');
      return null;
    }

    function SingleTreeWrapper({ children }: { children: React.ReactNode }) {
      const [mounted, setMountedState] = React.useState(true);
      setMounted = setMountedState;
      return (
        <DevPanelProvider config={devPanelConfig}>
          {mounted && <SimUser />}
          {children}
        </DevPanelProvider>
      );
    }

    const { result } = renderHook(() => useDevPanel(), {
      wrapper: SingleTreeWrapper,
    });

    expect(
      result.current.registeredSimulators.some((s) => s.id === 'test-form'),
    ).toBe(true);

    act(() => {
      setMounted(false);
    });

    expect(
      result.current.registeredSimulators.find((s) => s.id === 'test-form'),
    ).toBeUndefined();
  });
});
