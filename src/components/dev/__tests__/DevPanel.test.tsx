import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { DevPanel } from '../DevPanel';
import type { DevPanelConfig, DevPanelStateSimulator } from '../index';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({ locale: 'en' }),
}));

const config: DevPanelConfig = {
  projectName: 'Test Project',
  pages: [{ label: 'Home', path: '/', status: 'active' }],
  debugToggles: [
    { id: 'outline', label: 'Debug outlines', cssClass: 'debug-outlines' },
  ],
};

const simulators: DevPanelStateSimulator[] = [
  { id: 'form', label: 'Form', states: ['idle', 'success'] },
];

const baseCtx = {
  isOpen: true,
  togglePanel: vi.fn(),
  debugToggles: {},
  setDebugToggle: vi.fn(),
  simulatedStates: {},
  setSimulatedState: vi.fn(),
  registeredSimulators: simulators,
  registerSimulator: vi.fn(),
  unregisterSimulator: vi.fn(),
  config,
};

describe('DevPanel', () => {
  it('renders section headings when open with simulators in context', () => {
    render(<DevPanel ctx={baseCtx} />);
    expect(screen.getByText('Pages')).toBeDefined();
    expect(screen.getByText('Debug')).toBeDefined();
    expect(screen.getByText('State Simulator')).toBeDefined();
    expect(screen.getByText('Environment')).toBeDefined();
  });

  it('renders project name in header', () => {
    render(<DevPanel ctx={baseCtx} />);
    expect(screen.getByText('Dev Panel')).toBeDefined();
    expect(screen.getByText('Test Project Playground')).toBeDefined();
  });

  it('does not render optional sections when their data is absent', () => {
    const minimalCtx = {
      ...baseCtx,
      registeredSimulators: [],
      config: {
        projectName: 'Min',
        pages: [{ label: 'Home', path: '/', status: 'active' as const }],
      },
    };
    render(<DevPanel ctx={minimalCtx} />);
    expect(screen.queryByText('Debug')).toBeNull();
    expect(screen.queryByText('State Simulator')).toBeNull();
    // Required sections always render
    expect(screen.getByText('Pages')).toBeDefined();
    expect(screen.getByText('Environment')).toBeDefined();
  });
});
