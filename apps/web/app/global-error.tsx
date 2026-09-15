'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * Last-resort boundary: only renders when the root layout itself fails, so it
 * ships its own <html> and cannot rely on any app styling.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '26rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.125rem', margin: 0 }}>Something broke on our side</h1>
          <p style={{ color: '#6b7280', marginTop: '0.5rem', lineHeight: 1.6 }}>
            The error has been reported. Reload the page — if it keeps happening, let us know.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.25rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              background: 'transparent',
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
