import { useEffect, useRef, useState } from 'react';

export function useMinimumDuration(
  isLoading: boolean,
  durationMs = 300,
): boolean {
  const startedAt = useRef<number | null>(isLoading ? Date.now() : null);
  const [visible, setVisible] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      startedAt.current ??= Date.now();
      setVisible(true);
      return;
    }

    const elapsed =
      startedAt.current === null ? durationMs : Date.now() - startedAt.current;
    const remaining = Math.max(0, durationMs - elapsed);
    const timeout = setTimeout(() => {
      startedAt.current = null;
      setVisible(false);
    }, remaining);
    return () => clearTimeout(timeout);
  }, [durationMs, isLoading]);

  return visible;
}
