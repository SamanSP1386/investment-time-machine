'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <ErrorState
        title="Something went wrong"
        description="This page couldn't be displayed. Your data and any completed simulation are unaffected."
        requestId={error.digest}
        action={
          <Button variant="secondary" size="sm" onClick={() => unstable_retry()}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
