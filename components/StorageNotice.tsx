"use client";

import { useProgress } from "@/lib/progress";

export function StorageNotice() {
  const { storageError } = useProgress();
  if (!storageError) return null;
  return (
    <p role="status" className="mx-auto max-w-5xl border-t border-amber/30 px-5 py-3 text-sm text-amber sm:px-8">
      Nie udało się zapisać postępów w przeglądarce. Możesz uczyć się dalej, ale nowe wyniki mogą zniknąć po zamknięciu strony.
    </p>
  );
}
