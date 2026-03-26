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

export interface DevPanelAsset {
  label: string;
  value: string;
}

export interface DevPanelConfig {
  projectName: string;
  pages: DevPanelPage[];
  debugToggles?: DevPanelDebugToggle[];
  stateSimulators?: DevPanelStateSimulator[];
  assets?: DevPanelAsset[];
}

// Re-exports added as files are created in subsequent tasks:
// export { DevPanelProvider } from './DevPanelProvider';   // Task 4
// export { useDevPanel } from './useDevPanel';              // Task 4
// export type { DevPanelContextValue } from './DevPanelProvider'; // Task 4
// export { DevPanel } from './DevPanel';                   // Task 10

export { DevPanel } from './DevPanel';
export type { DevPanelContextValue } from './DevPanelProvider';
export { DevPanelProvider } from './DevPanelProvider';
export { useDevPanel } from './useDevPanel';
