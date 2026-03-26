import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DevPanelProvider,
  defaultDevPanelState,
} from '@/components/dev/DevPanelProvider';
import { useDevPanel } from '@/components/dev/useDevPanel';
import { render } from '@/test/utils';
import { ContactForm } from '../ContactForm';

describe('ContactForm simulated states', () => {
  it('renders submit button in idle state', () => {
    render(<ContactForm />, {
      devPanelValue: { ...defaultDevPanelState, simulatedStates: {} },
    });
    expect(screen.getByRole('button', { name: /send$/i })).toBeDefined();
  });

  it('shows loading state when simulated', () => {
    render(<ContactForm />, {
      devPanelValue: {
        ...defaultDevPanelState,
        simulatedStates: { 'contact-form': 'loading' },
      },
    });
    expect(screen.getByRole('button', { name: /sending/i })).toBeDefined();
    expect(
      (screen.getByRole('button', { name: /sending/i }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('shows success state when simulated', () => {
    render(<ContactForm />, {
      devPanelValue: {
        ...defaultDevPanelState,
        simulatedStates: { 'contact-form': 'success' },
      },
    });
    expect(screen.getByText(/message sent/i)).toBeDefined();
  });

  it('shows error state when simulated', () => {
    render(<ContactForm />, {
      devPanelValue: {
        ...defaultDevPanelState,
        simulatedStates: { 'contact-form': 'error' },
      },
    });
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });
});

describe('ContactForm submit handler', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows success after successful API response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    render(<ContactForm />, {
      devPanelValue: { ...defaultDevPanelState, simulatedStates: {} },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: /send$/i }).closest('form')!,
    );

    await waitFor(() => {
      expect(screen.getByText(/message sent/i)).toBeDefined();
    });
  });

  it('shows error after non-ok API response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);

    render(<ContactForm />, {
      devPanelValue: { ...defaultDevPanelState, simulatedStates: {} },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: /send$/i }).closest('form')!,
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeDefined();
    });
  });

  it('shows error when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    render(<ContactForm />, {
      devPanelValue: { ...defaultDevPanelState, simulatedStates: {} },
    });

    fireEvent.submit(
      screen.getByRole('button', { name: /send$/i }).closest('form')!,
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeDefined();
    });
  });
});

describe('ContactForm registration', () => {
  it('registers itself in the panel when mounted inside a live provider', () => {
    const { result } = renderHook(() => useDevPanel(), {
      wrapper: ({ children }) => (
        <DevPanelProvider config={{ projectName: 'test' }}>
          <ContactForm />
          {children}
        </DevPanelProvider>
      ),
    });
    expect(result.current.registeredSimulators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'contact-form', label: 'Contact Form' }),
      ]),
    );
  });
});
