export type PageStatus = 'active' | 'done' | 'wip' | 'todo';

export interface DevPanelPage {
  label: string;
  path: string;
  status: PageStatus;
}

export interface DevPanelDebugToggle {
  id: string;
  label: string;
  cssClass: string;
}

export interface DevPanelStateSimulator {
  id: string;
  label: string;
  states: string[];
}

export interface DevPanelConfig {
  projectName: string;
  pages?: DevPanelPage[]; // Optional — auto-scan fills in if omitted
  debugToggles?: DevPanelDebugToggle[];
}

export { DevPanel } from './DevPanel';
export type { DevPanelContextValue } from './DevPanelProvider';
export { DevPanelProvider } from './DevPanelProvider';
export { useDevPanel } from './useDevPanel';
// NOTE: useSimulatedState export is added in Task 4 — the file doesn't exist yet
