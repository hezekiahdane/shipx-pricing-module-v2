'use client';

import { useEffect } from 'react';
import { captureError } from '@/lib/monitoring/sentry';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    captureError(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center font-sans">
        <h1 className="text-3xl font-bold">Critical error</h1>
        <p className="max-w-md text-gray-600">
          A critical error occurred. Please refresh the page or contact support.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-2 max-w-xl overflow-auto rounded-lg bg-gray-100 p-4 text-left text-xs">
            {error.message}
          </pre>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Reload
        </button>
      </body>
    </html>
  );
}
