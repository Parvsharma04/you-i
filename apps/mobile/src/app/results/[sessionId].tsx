import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorBoundary } from '@/components/error-boundary';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import ResultScreen from '@/features/results/result-screen';
import { getSession, type SessionRecord } from '@/lib/storage';

function ResultsRouteInner() {
  const router = useRouter();
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
        <View className="flex-1 items-center justify-center">
          <Text variant="display-md" color="primary">
            LOADING…
          </Text>
        </View>
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
