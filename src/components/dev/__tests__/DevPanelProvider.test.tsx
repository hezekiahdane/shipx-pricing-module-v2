import { fireEvent } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/test/mocks/server';
import { act, render, screen, waitFor } from '@/test/utils';
import { DevPanelContext, DevPanelProvider } from '../DevPanelProvider';
import type { DevPanelConfig, DevPanelStateSimulator } from '../index';

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

function FullConsumer() {
  const ctx = useContext(DevPanelContext);
  return (
    <div>
      <span data-testid="discoveredPages">
        {JSON.stringify(ctx?.discoveredPages)}
      </span>
      <span data-testid="blockedPages">
        {JSON.stringify(ctx?.blockedPages)}
      </span>
      <span data-testid="registeredSimulators">
        {JSON.stringify(ctx?.registeredSimulators)}
      </span>
      <span data-testid="unregisteredFormCount">
        {ctx?.unregisteredFormCount}
      </span>
      <button type="button" onClick={() => ctx?.setPageBlocked('/about', true)}>
        block-about
      </button>
      <button
        type="button"
        onClick={() => ctx?.setPageBlocked('/about', false)}
      >
        unblock-about
      </button>
      <button
        type="button"
        onClick={() =>
          ctx?.registerSimulator({
            id: 'contact-form',
            label: 'Contact Form',
            states: ['idle', 'success', 'error'],
          })
        }
      >
        register-sim
      </button>
      <button
        type="button"
        onClick={() => ctx?.unregisterSimulator('contact-form')}
      >
        unregister-sim
      </button>
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

  // Feature 1: pages fetch + route blocking

  it('fetches discovered pages and merges with config on success', async () => {
    server.use(
      http.get('/api/dev/pages', () => {
        return HttpResponse.json({
          success: true,
          data: {
            pages: [
              { path: '/about', label: 'About' },
              { path: '/', label: 'Home Override' },
            ],
          },
          error: null,
        });
      }),
    );

    render(
      <DevPanelProvider config={config}>
        <FullConsumer />
      </DevPanelProvider>,
    );

    await waitFor(() => {
      const pages = JSON.parse(
        screen.getByTestId('discoveredPages').textContent ?? '[]',
      );
      // /about comes from API (not in config) → status: 'todo'
      const aboutPage = pages.find(
        (p: { path: string }) => p.path === '/about',
      );
      expect(aboutPage).toBeDefined();
      expect(aboutPage.status).toBe('todo');
      // / is in config → config override is used
      const homePage = pages.find((p: { path: string }) => p.path === '/');
      expect(homePage).toBeDefined();
      expect(homePage.status).toBe('active');
    });
  });

  it('falls back to config.pages when fetch fails', async () => {
    server.use(
      http.get('/api/dev/pages', () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    render(
      <DevPanelProvider config={config}>
        <FullConsumer />
      </DevPanelProvider>,
    );

    await waitFor(() => {
      const pages = JSON.parse(
        screen.getByTestId('discoveredPages').textContent ?? '[]',
      );
      expect(pages).toHaveLength(1);
      expect(pages[0].path).toBe('/');
      expect(pages[0].label).toBe('Home');
    });
  });

  it('sets blockedPages when setPageBlocked(path, true) is called', async () => {
    server.use(
      http.get('/api/dev/pages', () => {
        return HttpResponse.json({
          success: true,
          data: { pages: [] },
          error: null,
        });
      }),
    );

    render(
      <DevPanelProvider config={config}>
        <FullConsumer />
      </DevPanelProvider>,
    );

    await act(async () => fireEvent.click(screen.getByText('block-about')));

    const blocked = JSON.parse(
      screen.getByTestId('blockedPages').textContent ?? '[]',
    );
    expect(blocked).toContain('/about');
  });

  it('removes path from blockedPages when setPageBlocked(path, false) is called', async () => {
    server.use(
      http.get('/api/dev/pages', () => {
        return HttpResponse.json({
          success: true,
          data: { pages: [] },
          error: null,
        });
      }),
    );

    render(
      <DevPanelProvider config={config}>
        <FullConsumer />
      </DevPanelProvider>,
    );

    // Block then unblock
    await act(async () => fireEvent.click(screen.getByText('block-about')));
    await act(async () => fireEvent.click(screen.getByText('unblock-about')));

    const blocked = JSON.parse(
      screen.getByTestId('blockedPages').textContent ?? '[]',
    );
    expect(blocked).not.toContain('/about');
  });

  it('writes devpanel_blocked cookie when blockedPages changes', async () => {
    server.use(
      http.get('/api/dev/pages', () => {
        return HttpResponse.json({
          success: true,
          data: { pages: [] },
          error: null,
        });
      }),
    );

    render(
      <DevPanelProvider config={config}>
        <FullConsumer />
      </DevPanelProvider>,
    );

    await act(async () => fireEvent.click(screen.getByText('block-about')));

    expect(document.cookie).toContain('devpanel_blocked');
  });

  // Feature 2: form scan + simulator registration

  it('counts unregistered forms after 300ms timer fires', async () => {
    vi.useFakeTimers();

    server.use(
      http.get('/api/dev/pages', () => {
        return HttpResponse.json({
          success: true,
          data: { pages: [] },
          error: null,
        });
      }),
    );

    const { container } = render(
      <DevPanelProvider config={config}>
        <FullConsumer />
        <form id="test-form" />
        <form id="another-form" />
      </DevPanelProvider>,
    );

    // Advance timers past the 300ms debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const count = Number(
      container.querySelector('[data-testid="unregisteredFormCount"]')
        ?.textContent,
    );
    // Both forms are unregistered
    expect(count).toBeGreaterThanOrEqual(2);

    vi.useRealTimers();
  });

  it('does not count forms with matching data-sim-id as unregistered', async () => {
    vi.useFakeTimers();

    server.use(
      http.get('/api/dev/pages', () => {
        return HttpResponse.json({
          success: true,
          data: { pages: [] },
          error: null,
        });
      }),
    );

    const registeredSim: DevPanelStateSimulator = {
      id: 'contact-form',
      label: 'Contact Form',
      states: ['idle', 'success', 'error'],
    };

    const configWithSim: DevPanelConfig = { ...config };

    function RegisteredFormConsumer() {
      const ctx = useContext(DevPanelContext);
      // Register simulator on mount via effect simulation (direct call for testing)
      return (
        <div>
          <span data-testid="unregisteredFormCount">
            {ctx?.unregisteredFormCount}
          </span>
          <button
            type="button"
            onClick={() => ctx?.registerSimulator(registeredSim)}
          >
            register
          </button>
        </div>
      );
    }

    render(
      <DevPanelProvider config={configWithSim}>
        <RegisteredFormConsumer />
        <form data-sim-id="contact-form" />
        <form id="other-form" />
      </DevPanelProvider>,
    );

    // Register the simulator before scan fires
    await act(async () => {
      fireEvent.click(screen.getByText('register'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const count = Number(
      screen.getByTestId('unregisteredFormCount').textContent,
    );
    // contact-form is registered, only other-form is unregistered
    expect(count).toBe(1);

    vi.useRealTimers();
  });

  // Simulator registration via context

  it('registerSimulator adds to registeredSimulators', async () => {
    render(
      <DevPanelProvider config={config}>
        <FullConsumer />
      </DevPanelProvider>,
    );

    await act(async () => fireEvent.click(screen.getByText('register-sim')));

    const sims = JSON.parse(
      screen.getByTestId('registeredSimulators').textContent ?? '[]',
    );
    expect(sims).toHaveLength(1);
    expect(sims[0].id).toBe('contact-form');
  });

  it('registerSimulator does not add duplicate simulators', async () => {
    render(
      <DevPanelProvider config={config}>
        <FullConsumer />
      </DevPanelProvider>,
    );

    await act(async () => fireEvent.click(screen.getByText('register-sim')));
    await act(async () => fireEvent.click(screen.getByText('register-sim')));

    const sims = JSON.parse(
      screen.getByTestId('registeredSimulators').textContent ?? '[]',
    );
    expect(sims).toHaveLength(1);
  });

  it('unregisterSimulator removes from registeredSimulators', async () => {
    render(
      <DevPanelProvider config={config}>
        <FullConsumer />
      </DevPanelProvider>,
    );

    await act(async () => fireEvent.click(screen.getByText('register-sim')));
    await act(async () => fireEvent.click(screen.getByText('unregister-sim')));

    const sims = JSON.parse(
      screen.getByTestId('registeredSimulators').textContent ?? '[]',
    );
    expect(sims).toHaveLength(0);
  });
});
