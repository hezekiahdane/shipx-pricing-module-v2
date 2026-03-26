import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { DevPanel } from '../DevPanel';
import type { DevPanelConfig } from '../index';

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
  stateSimulators: [{ id: 'form', label: 'Form', states: ['idle', 'success'] }],
  assets: [{ label: 'Hero', value: '/hero.jpg' }],
};

const baseCtx = {
  isOpen: true,
  togglePanel: vi.fn(),
  debugToggles: {},
  setDebugToggle: vi.fn(),
  simulatedStates: {},
  setSimulatedState: vi.fn(),
  config,
};

describe('DevPanel', () => {
  it('renders all section headings when open', () => {
    render(<DevPanel ctx={baseCtx} />);
    expect(screen.getByText('Pages')).toBeDefined();
    expect(screen.getByText('Debug')).toBeDefined();
    expect(screen.getByText('State Simulator')).toBeDefined();
    expect(screen.getByText('Environment')).toBeDefined();
    expect(screen.getByText('Assets')).toBeDefined();
  });

  it('renders project name in header', () => {
    render(<DevPanel ctx={baseCtx} />);
    expect(screen.getByText('Dev Panel')).toBeDefined();
    expect(screen.getByText('Test Project Playground')).toBeDefined();
  });

  it('does not render optional sections when their config arrays are absent', () => {
    const minimalCtx = {
      ...baseCtx,
      config: {
        projectName: 'Min',
        pages: [{ label: 'Home', path: '/', status: 'active' as const }],
      },
    };
    render(<DevPanel ctx={minimalCtx} />);
    expect(screen.queryByText('Debug')).toBeNull();
    expect(screen.queryByText('State Simulator')).toBeNull();
    expect(screen.queryByText('Assets')).toBeNull();
    // Required sections always render
    expect(screen.getByText('Pages')).toBeDefined();
    expect(screen.getByText('Environment')).toBeDefined();
  });
});
