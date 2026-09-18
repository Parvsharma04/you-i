import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { QuizScreen } from '@/features/quiz/quiz-screen';
import { getSession, type SessionRecord } from '@/lib/storage';

export default function QuizRoute() {
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
        <Text variant="display-md" color="primary">
          LOADING…
        </Text>
      </Screen>
    );
  }

  if (!record) {
    return null;
  }

  return (
    <QuizScreen
      sessionId={sessionId}
      playerId={record.playerId}
      role={record.role}
    />
  );
}
