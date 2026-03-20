'use client';

import { useEffect } from 'react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // biome-ignore lint/suspicious/noConsole: Error boundary needs console.error for debugging
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-h2 font-heading text-header">Something went wrong</h1>
      <p className="text-body-md text-body max-w-md">
        An unexpected error occurred. Please try again, or contact support if
        the problem persists.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="bg-muted mt-2 max-w-xl overflow-auto rounded-lg p-4 text-left text-xs">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={reset}
        className="bg-primary-600 hover:bg-primary-700 mt-2 rounded-lg px-6 py-2 text-white transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
