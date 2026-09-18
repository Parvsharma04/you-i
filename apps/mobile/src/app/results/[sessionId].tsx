import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  generateResult,
  getResult,
} from '@/lib/api';
import { getSession, type SessionRecord } from '@/lib/storage';

import type { Result } from '@youandi/shared';

const POLL_INTERVAL_MS = 3000;

export default function ResultsRoute() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Array.isArray(rawParams.sessionId)
    ? rawParams.sessionId[0]
    : rawParams.sessionId;

  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [checking, setChecking] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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

  useEffect(() => {
    if (!record || !sessionId) return;

    let mounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const playerId = record.playerId;

    async function load() {
      try {
        const status = await getResult(sessionId, playerId);
        if (status.status === 'ready' && status.data) {
          if (mounted) {
            setResult(status.data);
            setError(null);
          }
          if (intervalId) clearInterval(intervalId);
          return;
        }

        if (status.status === 'none') {
          await generateResult(sessionId, playerId);
        }

        if (mounted) setError(null);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof NetworkError || err instanceof TimeoutError) {
          setError("You're offline. Results will load when you reconnect.");
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Could not load results.');
        }
      }
    }

    load();
    intervalId = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [record, sessionId, retryCount]);

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

  if (error && !result) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-6 px-6">
          <Text variant="display-xl" color="primary">
            X_X
          </Text>
          <Text variant="display-md" color="primary" className="text-center">
            {error}
          </Text>
          <Button
            title="TRY AGAIN"
            onPress={() => {
              setError(null);
              setRetryCount((c) => c + 1);
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!result) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="display-md" color="primary">
            ANALYZING…
          </Text>
          <Text variant="body" color="muted" className="text-center">
            CALCULATING VIBES
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 gap-6 px-6 py-8">
        <View className="items-center gap-3">
          <Text variant="display-xl" color="accent">
            {result.score >= 90
              ? '★_★'
              : result.score >= 75
                ? '^__^'
                : result.score >= 60
                  ? '-__-'
                  : result.score >= 40
                    ? 'O_O'
                    : 'X_X'}
          </Text>
          <Text variant="display-lg" color="primary">
            {result.score}% MATCH
          </Text>
        </View>

        <Card>
          <View className="gap-3">
            <Text variant="display-md" color="primary">
              SYSTEM ANALYSIS
            </Text>
            <Text variant="body" color="secondary">
              {result.summary}
            </Text>
          </View>
        </Card>

        <Card>
          <View className="gap-3">
            <Text variant="display-md" color="primary">
              STRENGTHS
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {result.strengths.map((strength, index) => (
                <View
                  key={index}
                  className="border-2 border-border-color bg-bg-secondary px-3 py-1"
                >
                  <Text variant="body-sm" color="primary">
                    {strength}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <Card>
          <View className="gap-3">
            <Text variant="display-md" color="primary">
              WEAKNESSES
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {result.differences.map((difference, index) => (
                <View
                  key={index}
                  className="border-2 border-border-color bg-bg-secondary px-3 py-1"
                >
                  <Text variant="body-sm" color="primary">
                    {difference}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <View className="mt-auto">
          <Button title="PLAY AGAIN" onPress={() => router.replace('/')} />
        </View>
      </View>
    </Screen>
  );
}
