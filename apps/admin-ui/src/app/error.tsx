"use client";
import React, { useEffect } from 'react';

// Next.js will use this global error boundary for the app router (error.js/tsx contract)
// It receives an error and reset function. We enrich with a go back + toggle details UI.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  useEffect(() => {
    console.error('Global render error:', error);
  }, [error]);

  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <html>
      <body className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">A render error occurred. You can try again or return to the previous page.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-1.5 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium px-4 py-2 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400"
            >Retry</button>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >Go Back</button>
            <button
              onClick={() => setShowDetails(v => !v)}
              className="inline-flex items-center gap-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >{showDetails ? 'Hide details' : 'Show details'}</button>
          </div>
          {showDetails && (
            <div className="rounded border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950 p-4 text-xs overflow-auto max-h-80 whitespace-pre-wrap">
              <strong className="block mb-2">{error.name}: {error.message}</strong>
              {error.stack}
              {error.digest && <div className="mt-2 opacity-70">Digest: {error.digest}</div>}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
