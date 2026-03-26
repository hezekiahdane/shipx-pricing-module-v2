'use client';

import type { DevPanelDebugToggle } from '../index';

interface DebugSectionProps {
  toggles: DevPanelDebugToggle[];
  activeToggles: Record<string, boolean>;
  onToggle: (id: string, value: boolean) => void;
}

export function DebugSection({
  toggles,
  activeToggles,
  onToggle,
}: DebugSectionProps) {
  return (
    <div className="border-b border-neutral-800 py-2">
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
        Debug
      </p>
      {toggles.map((toggle) => {
        const isOn = !!activeToggles[toggle.id];
        return (
          <div
            key={toggle.id}
            className="flex items-center justify-between px-4 py-1.5"
          >
            <span className="text-xs text-neutral-400">{toggle.label}</span>
            <button
              type="button"
              onClick={() => onToggle(toggle.id, !isOn)}
              className={`rounded border px-2 py-0.5 text-[10px] font-bold tracking-wider transition-colors ${
                isOn
                  ? 'border-green-700 bg-green-900/50 text-green-400'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-500'
              }`}
            >
              {isOn ? 'ON' : 'OFF'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
