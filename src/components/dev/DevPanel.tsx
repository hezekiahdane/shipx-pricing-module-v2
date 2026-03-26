'use client';

import { useParams } from 'next/navigation';
import type { DevPanelContextValue } from './DevPanelProvider';
import { AssetSection } from './sections/AssetSection';
import { DebugSection } from './sections/DebugSection';
import { EnvSection } from './sections/EnvSection';
import { PagesSection } from './sections/PagesSection';
import { StateSimSection } from './sections/StateSimSection';

const ENV_BADGE = {
  development: {
    label: 'LOCAL',
    className: 'border-green-700 bg-green-900/50 text-green-400',
  },
  test: {
    label: 'TEST',
    className: 'border-neutral-700 bg-neutral-800 text-neutral-400',
  },
  production: {
    label: 'LIVE',
    className: 'border-red-700 bg-red-900/50 text-red-400',
  },
  preview: {
    label: 'STAGING',
    className: 'border-blue-700 bg-blue-900/50 text-blue-400',
  },
};

interface DevPanelProps {
  ctx: DevPanelContextValue;
}

export function DevPanel({ ctx }: DevPanelProps) {
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : 'en';

  const nodeEnv = process.env.NODE_ENV; // NODE_ENV: Next.js static analysis exception
  const badge =
    ENV_BADGE[nodeEnv as keyof typeof ENV_BADGE] ?? ENV_BADGE.development;

  const {
    config,
    togglePanel,
    debugToggles,
    setDebugToggle,
    simulatedStates,
    setSimulatedState,
  } = ctx;

  return (
    <>
      {/* FAB — always visible, toggles panel */}
      <button
        type="button"
        onClick={togglePanel}
        aria-label="Toggle dev panel"
        className="fixed bottom-6 right-6 z-[9999] flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 shadow-2xl transition-colors hover:border-neutral-500 hover:text-neutral-200"
      >
        ×
      </button>

      {/* Panel */}
      {ctx.isOpen && (
        <div className="fixed bottom-20 right-6 z-[9998] w-[340px] overflow-hidden rounded-xl border border-neutral-800 bg-[#0d1117] font-mono shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              Dev Panel
            </span>
            <span
              className={`rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          {/* Sections */}
          <PagesSection pages={config.pages} />
          {config.debugToggles && config.debugToggles.length > 0 && (
            <DebugSection
              toggles={config.debugToggles}
              activeToggles={debugToggles}
              onToggle={setDebugToggle}
            />
          )}
          {config.stateSimulators && config.stateSimulators.length > 0 && (
            <StateSimSection
              simulators={config.stateSimulators}
              activeStates={simulatedStates}
              onStateChange={setSimulatedState}
            />
          )}
          <EnvSection projectName={config.projectName} locale={locale} />
          {config.assets && config.assets.length > 0 && (
            <AssetSection assets={config.assets} />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[10px] text-neutral-700">` to close</span>
            <span className="text-[10px] text-neutral-700">
              {config.projectName} Playground
            </span>
          </div>
        </div>
      )}
    </>
  );
}
