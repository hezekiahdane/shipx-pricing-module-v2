'use client';

import dynamic from 'next/dynamic';
import type { DevPanelConfig } from './index';

const DevPanelProvider = dynamic(
  () => import('./DevPanelProvider').then((m) => m.DevPanelProvider),
  { ssr: false },
);

interface DevPanelWrapperProps {
  config: DevPanelConfig;
  children: React.ReactNode;
}

export function DevPanelWrapper({ config, children }: DevPanelWrapperProps) {
  return <DevPanelProvider config={config}>{children}</DevPanelProvider>;
}
