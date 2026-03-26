'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useEffect, useState } from 'react';
import { DevPanel } from './DevPanel';
import type {
  DevPanelConfig,
  DevPanelPage,
  DevPanelStateSimulator,
} from './index';

export interface DevPanelContextValue {
  isOpen: boolean;
  togglePanel: () => void;
  debugToggles: Record<string, boolean>;
  setDebugToggle: (id: string, value: boolean) => void;
  simulatedStates: Record<string, string>;
  setSimulatedState: (id: string, state: string) => void;
  config: DevPanelConfig;
  // Feature 1: page discovery + blocking
  discoveredPages: DevPanelPage[];
  blockedPages: string[];
  setPageBlocked: (path: string, blocked: boolean) => void;
  // Feature 2: state simulator auto-registration
  registeredSimulators: DevPanelStateSimulator[];
  registerSimulator: (sim: DevPanelStateSimulator) => void;
  unregisterSimulator: (id: string) => void;
  unregisteredFormCount: number;
}

// Null-safe fallback returned by useDevPanel() when called outside the provider.
export const defaultDevPanelState: DevPanelContextValue = {
  isOpen: false,
  togglePanel: () => {},
  debugToggles: {},
  setDebugToggle: () => {},
  simulatedStates: {},
  setSimulatedState: () => {},
  config: { projectName: '', pages: [] },
  discoveredPages: [],
  blockedPages: [],
  setPageBlocked: () => {},
  registeredSimulators: [],
  registerSimulator: () => {},
  unregisterSimulator: () => {},
  unregisteredFormCount: 0,
};

export const DevPanelContext = createContext<DevPanelContextValue | null>(null);

interface DevPanelProviderProps {
  config: DevPanelConfig;
  children: React.ReactNode;
}

export function DevPanelProvider({ config, children }: DevPanelProviderProps) {
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [debugToggles, setDebugToggles] = useState<Record<string, boolean>>({});
  const [simulatedStates, setSimulatedStates] = useState<
    Record<string, string>
  >({});
  const [discoveredPages, setDiscoveredPages] = useState<DevPanelPage[]>([]);
  const [blockedPages, setBlockedPages] = useState<string[]>([]);
  const [registeredSimulators, setRegisteredSimulators] = useState<
    DevPanelStateSimulator[]
  >([]);
  const [unregisteredFormCount, setUnregisteredFormCount] = useState(0);

  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);

  const setDebugToggle = useCallback((id: string, value: boolean) => {
    setDebugToggles((prev) => ({ ...prev, [id]: value }));
  }, []);

  const setSimulatedState = useCallback((id: string, state: string) => {
    setSimulatedStates((prev) => ({ ...prev, [id]: state }));
  }, []);

  const setPageBlocked = useCallback((path: string, blocked: boolean) => {
    setBlockedPages((prev) =>
      blocked
        ? [...prev.filter((p) => p !== path), path]
        : prev.filter((p) => p !== path),
    );
  }, []);

  const registerSimulator = useCallback((sim: DevPanelStateSimulator) => {
    setRegisteredSimulators((prev) =>
      prev.some((s) => s.id === sim.id) ? prev : [...prev, sim],
    );
  }, []);

  const unregisterSimulator = useCallback((id: string) => {
    setRegisteredSimulators((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Feature 1 — fetch discovered pages on mount
  useEffect(() => {
    fetch('/api/dev/pages')
      .then((r) => r.json())
      .then((json) => {
        const fetched: Array<{ path: string; label: string }> =
          json.data?.pages ?? [];
        const configPages = config.pages ?? [];
        const merged: DevPanelPage[] = fetched.map((p) => {
          const override = configPages.find((c) => c.path === p.path);
          return override ?? { ...p, status: 'todo' as const };
        });
        for (const cp of configPages) {
          if (!merged.some((m) => m.path === cp.path)) merged.push(cp);
        }
        setDiscoveredPages(merged);
      })
      .catch(() => {
        setDiscoveredPages(config.pages ?? []);
      });
  }, [config.pages]);

  // Feature 1 — sync blockedPages to cookie
  useEffect(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: dev-only panel uses direct cookie API intentionally
    document.cookie = `devpanel_blocked=${JSON.stringify(blockedPages)}; SameSite=Strict; Path=/; Max-Age=86400`;
    return () => {
      // biome-ignore lint/suspicious/noDocumentCookie: cleanup on unmount
      document.cookie = 'devpanel_blocked=; SameSite=Strict; Path=/; Max-Age=0';
    };
  }, [blockedPages]);

  // Feature 2 — deferred form detection after route change.
  // pathname is intentionally included to re-scan on navigation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname triggers re-scan on route change; registeredSimulators is read-only inside timer
  useEffect(() => {
    const timer = setTimeout(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const registeredIds = new Set(registeredSimulators.map((s) => s.id));
      let unregistered = 0;
      for (const form of forms) {
        const formId = form.id || form.getAttribute('data-sim-id') || '';
        if (!registeredIds.has(formId)) unregistered++;
      }
      setUnregisteredFormCount(unregistered);
    }, 300);
    return () => clearTimeout(timer);
  }, [pathname, registeredSimulators]);

  // Apply debug CSS classes to document.body
  useEffect(() => {
    for (const [id, enabled] of Object.entries(debugToggles)) {
      const toggle = config.debugToggles?.find((t) => t.id === id);
      if (!toggle) continue;
      if (enabled) {
        document.body.classList.add(toggle.cssClass);
      } else {
        document.body.classList.remove(toggle.cssClass);
      }
    }
    return () => {
      for (const [id, enabled] of Object.entries(debugToggles)) {
        if (!enabled) continue;
        const toggle = config.debugToggles?.find((t) => t.id === id);
        if (toggle) document.body.classList.remove(toggle.cssClass);
      }
    };
  }, [debugToggles, config.debugToggles]);

  // Keyboard listener — backtick toggles panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '`') togglePanel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePanel]);

  const value: DevPanelContextValue = {
    isOpen,
    togglePanel,
    debugToggles,
    setDebugToggle,
    simulatedStates,
    setSimulatedState,
    config,
    discoveredPages,
    blockedPages,
    setPageBlocked,
    registeredSimulators,
    registerSimulator,
    unregisterSimulator,
    unregisteredFormCount,
  };

  return (
    <DevPanelContext.Provider value={value}>
      {children}
      <DevPanel ctx={value} />
    </DevPanelContext.Provider>
  );
}
