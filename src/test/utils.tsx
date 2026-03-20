/**
 * Custom render helper that wraps components with necessary providers.
 * Use this instead of @testing-library/react's `render` directly.
 */

import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement } from 'react';

// Extend with additional providers as needed (e.g. NextIntlClientProvider, QueryClientProvider)
function AllProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
