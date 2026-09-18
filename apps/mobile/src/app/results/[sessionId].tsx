import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingView } from '@/components/loading-view';
import { Screen } from '@/components/ui/screen';
import ResultScreen from '@/features/results/result-screen';
import { useInterceptBack } from '@/hooks/useInterceptBack';
import { getSession, type SessionRecord } from '@/lib/storage';

function ResultsRouteInner() {
  const router = useRouter();

  // Hardware back / gesture back from results should go home, not back into
  // the quiz. We use Expo Router's `useNavigation` + `beforeRemove` rather
  // than `BackHandler` directly.
  useInterceptBack(
    useCallback(
      ({ preventDefault }) => {
        preventDefault();
        router.replace('/');
      },
      [router],
    ),
  );

  const rawParams = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Array.isArray(rawParams.sessionId)
    ? rawParams.sessionId[0]
    : rawParams.sessionId;

  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;
    getSession(sessionId).then((stored) => {
      if (!mounted) return;
      if (!stored) {
        router.replace(`/lobby/${sessionId}`);
        return;
      }
      setRecord(stored);
      setChecking(false);
    });

    return () => {
      mounted = false;
    };
  }, [sessionId, router]);

  if (!sessionId || checking) {
    return (
      <Screen>
        <LoadingView
          title="LOADING RESULTS…"
          subtitle="Finding your saved result."
        />
      </Screen>
    );
  }

  if (!record) {
    return null;
  }

  return <ResultScreen record={record} />;
}

export default function ResultsRoute() {
  return (
    <ErrorBoundary context={{ route: 'results' }}>
      <ResultsRouteInner />
    </ErrorBoundary>
  );
}
