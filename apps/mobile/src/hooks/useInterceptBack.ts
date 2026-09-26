import { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';

type BeforeRemoveEvent = {
  preventDefault: () => void;
  data?: { action?: { type?: string } };
};

type BeforeRemoveHandler = (event: BeforeRemoveEvent) => void;

export function useInterceptBack(handler: BeforeRemoveHandler) {
  const navigation = useNavigation();

  const handlerRef = useRef(handler);
  const navigatingRef = useRef(false);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'beforeRemove',
      (event: BeforeRemoveEvent) => {
        // Allow the navigation triggered by our own handler to go through.
        if (navigatingRef.current) {
          navigatingRef.current = false;
          return;
        }

        handlerRef.current({
          ...event,
          preventDefault: () => {
            event.preventDefault();
            navigatingRef.current = true;
          },
        });
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
