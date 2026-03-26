/**
 * Custom render helper that wraps components with necessary providers.
 * Use this instead of @testing-library/react's `render` directly.
 */

import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { DevPanelContextValue } from '@/components/dev';
import {
  DevPanelContext,
  defaultDevPanelState,
} from '@/components/dev/DevPanelProvider';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  devPanelValue?: Partial<DevPanelContextValue>;
}

// Extend with additional providers as needed (e.g. NextIntlClientProvider, QueryClientProvider)
function AllProviders({
  children,
  devPanelValue,
}: {
  children: React.ReactNode;
  devPanelValue?: Partial<DevPanelContextValue>;
}) {
  const ctxValue: DevPanelContextValue = {
    ...defaultDevPanelState,
    ...devPanelValue,
  };
  return (
    <DevPanelContext.Provider value={ctxValue}>
      {children}
    </DevPanelContext.Provider>
  );
}

function customRender(
  ui: ReactElement,
  { devPanelValue, ...options }: CustomRenderOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders devPanelValue={devPanelValue}>{children}</AllProviders>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
export { customRender as render };
