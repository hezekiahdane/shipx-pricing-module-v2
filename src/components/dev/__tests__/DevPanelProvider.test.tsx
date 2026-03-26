import { fireEvent } from '@testing-library/react';
import { useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@/test/utils';
import { DevPanelContext, DevPanelProvider } from '../DevPanelProvider';
import type { DevPanelConfig } from '../index';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({ locale: 'en' }),
}));

const config: DevPanelConfig = {
  projectName: 'Test Project',
  pages: [{ label: 'Home', path: '/', status: 'active' }],
};

function TestConsumer() {
  const ctx = useContext(DevPanelContext);
  return (
    <div>
      <span data-testid="open">{ctx?.isOpen ? 'open' : 'closed'}</span>
      <button type="button" onClick={() => ctx?.togglePanel()}>
        toggle
      </button>
      <button
        type="button"
        onClick={() => ctx?.setDebugToggle('outline', true)}
      >
        debug-on
      </button>
      <span data-testid="debug">{JSON.stringify(ctx?.debugToggles)}</span>
      <button
        type="button"
        onClick={() => ctx?.setSimulatedState('form', 'success')}
      >
        sim
      </button>
      <span data-testid="sim">{JSON.stringify(ctx?.simulatedStates)}</span>
    </div>
  );
}

describe('DevPanelProvider', () => {
  it('provides closed state by default', () => {
    render(
      <DevPanelProvider config={config}>
        <TestConsumer />
      </DevPanelProvider>,
    );
    expect(screen.getByTestId('open').textContent).toBe('closed');
  });

  it('toggles open state when togglePanel is called', async () => {
    render(
      <DevPanelProvider config={config}>
        <TestConsumer />
      </DevPanelProvider>,
    );
    await act(async () => fireEvent.click(screen.getByText('toggle')));
    expect(screen.getByTestId('open').textContent).toBe('open');
  });

  it('toggles panel on backtick keydown', async () => {
    render(
      <DevPanelProvider config={config}>
        <TestConsumer />
      </DevPanelProvider>,
    );
    await act(async () => fireEvent.keyDown(window, { key: '`' }));
    expect(screen.getByTestId('open').textContent).toBe('open');
  });

  it('updates debugToggles via setDebugToggle', async () => {
    render(
      <DevPanelProvider config={config}>
        <TestConsumer />
      </DevPanelProvider>,
    );
    await act(async () => fireEvent.click(screen.getByText('debug-on')));
    expect(screen.getByTestId('debug').textContent).toContain('"outline":true');
  });

  it('updates simulatedStates via setSimulatedState', async () => {
    render(
      <DevPanelProvider config={config}>
        <TestConsumer />
      </DevPanelProvider>,
    );
    await act(async () => fireEvent.click(screen.getByText('sim')));
    expect(screen.getByTestId('sim').textContent).toContain('"form":"success"');
  });

  it('removes keyboard listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(
      <DevPanelProvider config={config}>
        <TestConsumer />
      </DevPanelProvider>,
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('removes debug CSS class when toggle is turned off', async () => {
    const configWithDebug: DevPanelConfig = {
      ...config,
      debugToggles: [
        { id: 'outline', label: 'Outlines', cssClass: 'debug-outlines' },
      ],
    };

    function ToggleConsumer() {
      const ctx = useContext(DevPanelContext);
      return (
        <div>
          <button
            type="button"
            onClick={() => ctx?.setDebugToggle('outline', true)}
          >
            on
          </button>
          <button
            type="button"
            onClick={() => ctx?.setDebugToggle('outline', false)}
          >
            off
          </button>
        </div>
      );
    }

    render(
      <DevPanelProvider config={configWithDebug}>
        <ToggleConsumer />
      </DevPanelProvider>,
    );

    // Turn on — class should be added
    await act(async () => fireEvent.click(screen.getByText('on')));
    expect(document.body.classList.contains('debug-outlines')).toBe(true);

    // Turn off — class should be removed (covers the else branch on line 61)
    await act(async () => fireEvent.click(screen.getByText('off')));
    expect(document.body.classList.contains('debug-outlines')).toBe(false);
  });
});
