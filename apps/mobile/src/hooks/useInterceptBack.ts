import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';

type BeforeRemoveEvent = {
  preventDefault: () => void;
  data?: { action?: { type?: string } };
};

type BeforeRemoveHandler = (event: BeforeRemoveEvent) => void;

/**
 * Intercept the React Navigation `beforeRemove` event (hardware back,
 * gesture back, or header back) for the current screen. Expo Router
 * exposes `useNavigation`, so we use the navigation event API instead
 * of reaching for `BackHandler` directly.
 *
 * Set `leavingIntentionallyRef.current = true` before programmatic
 * navigation (e.g. pushing results) to skip the intercept.
 */
export function useInterceptBack(handler: BeforeRemoveHandler) {
  const navigation = useNavigation();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'beforeRemove',
      (event: BeforeRemoveEvent) => {
        handlerRef.current(event);
      },
    );

    return unsubscribe;
  }, [navigation]);
}

export function useLeavingIntentionally() {
  const ref = useRef(false);

  const markLeaving = useCallback(() => {
    ref.current = true;
  }, []);

  return { leavingIntentionallyRef: ref, markLeaving };
}
