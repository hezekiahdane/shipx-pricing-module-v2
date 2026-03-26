import { useContext, useEffect } from 'react';
import { DevPanelContext } from './DevPanelProvider';

export function useSimulatedState(
  id: string,
  label: string,
  states: string[],
  defaultState: string,
): string {
  const ctx = useContext(DevPanelContext);

  // Only re-run when `id` changes — label/states/ctx methods are stable references.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only registration keyed on id
  useEffect(() => {
    if (!ctx) return;
    ctx.registerSimulator({ id, label, states });
    return () => {
      ctx.unregisterSimulator(id);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ctx) return defaultState;
  return ctx.simulatedStates[id] ?? defaultState;
}
