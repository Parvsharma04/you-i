import { useEffect, useRef } from 'react';

/**
 * Returns a ref that always holds the latest value, useful for reading
 * callbacks inside long-lived subscriptions without re-registering them.
 */
export function useLatest<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
