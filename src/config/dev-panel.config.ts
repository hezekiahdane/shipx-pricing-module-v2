import type { DevPanelConfig } from '@/components/dev';

/**
 * Dev Panel configuration for this project.
 * `pages` is optional — the panel auto-discovers routes from the filesystem.
 * Override specific pages here to set a custom label or status badge.
 */
export const devPanelConfig: DevPanelConfig = {
  projectName: 'My App',

  // Optional overrides — auto-scan fills in everything else as 'todo'
  // pages: [{ label: 'Homepage', path: '/', status: 'active' }],

  debugToggles: [
    { id: 'outlines', label: 'Debug outlines', cssClass: 'debug-outlines' },
    { id: 'grid', label: 'Grid overlay', cssClass: 'debug-grid' },
    { id: 'breakpoint', label: 'Show breakpoint', cssClass: 'debug-bp' },
  ],
};
