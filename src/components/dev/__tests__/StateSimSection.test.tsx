import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import type { DevPanelStateSimulator } from '../index';
import { StateSimSection } from '../sections/StateSimSection';

const simulators: DevPanelStateSimulator[] = [
  {
    id: 'contactForm',
    label: 'Contact Form',
    states: ['idle', 'success', 'error'],
  },
];

describe('StateSimSection', () => {
  it('renders registered simulator label', () => {
    render(<StateSimSection />, {
      devPanelValue: {
        registeredSimulators: simulators,
        simulatedStates: {},
      },
    });
    expect(screen.getByText('Contact Form')).toBeDefined();
  });

  it('renders all state buttons for a simulator', () => {
    render(<StateSimSection />, {
      devPanelValue: {
        registeredSimulators: simulators,
        simulatedStates: {},
      },
    });
    expect(screen.getByText('idle')).toBeDefined();
    expect(screen.getByText('success')).toBeDefined();
    expect(screen.getByText('error')).toBeDefined();
  });

  it('active state button has highlighted appearance (border-blue-500)', () => {
    render(<StateSimSection />, {
      devPanelValue: {
        registeredSimulators: simulators,
        simulatedStates: { contactForm: 'success' },
      },
    });
    const btn = screen.getByText('success').closest('button');
    expect(btn?.className).toContain('border-blue-500');
  });

  it('clicking a state button calls setSimulatedState with id and state', () => {
    const setSimulatedState = vi.fn();
    render(<StateSimSection />, {
      devPanelValue: {
        registeredSimulators: simulators,
        simulatedStates: {},
        setSimulatedState,
      },
    });
    fireEvent.click(screen.getByText('success'));
    expect(setSimulatedState).toHaveBeenCalledWith('contactForm', 'success');
  });

  it('shows unregistered form hint when unregisteredFormCount > 0', () => {
    render(<StateSimSection />, {
      devPanelValue: {
        registeredSimulators: simulators,
        simulatedStates: {},
        unregisteredFormCount: 2,
      },
    });
    expect(
      screen.getByText(
        /2 form\(s\) detected — add useSimulatedState to wire states\./i,
      ),
    ).toBeDefined();
  });

  it('hides unregistered form hint when unregisteredFormCount === 0', () => {
    render(<StateSimSection />, {
      devPanelValue: {
        registeredSimulators: simulators,
        simulatedStates: {},
        unregisteredFormCount: 0,
      },
    });
    expect(screen.queryByText(/form\(s\) detected/i)).toBeNull();
  });

  it('renders nothing when no simulators and no unregistered forms', () => {
    const { container } = render(<StateSimSection />, {
      devPanelValue: {
        registeredSimulators: [],
        simulatedStates: {},
        unregisteredFormCount: 0,
      },
    });
    // Section self-manages empty state by returning null
    expect(container.firstChild).toBeNull();
  });
});
