import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import Animated, {
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  SCORE_RANK_THRESHOLDS,
  type Category,
  type ScoreRank,
} from '@youandi/shared';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton, SkeletonText } from '@/components/loading';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { createSession } from '@/lib/api';
import { env } from '@/lib/env';
import { useAppFonts } from '@/lib/fonts';
import { saveSession, type SessionRecord } from '@/lib/storage';
import { FadeInStagger, useAccessibilityReduceMotion } from '@/theme';

import { useResult } from './use-result';
import { useShareResult } from './use-share-result';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const LazyShareCard = lazy(() =>
  import('./ShareCard').then(({ ShareCard }) => ({ default: ShareCard })),
);

type ResultScreenProps = {
  record: SessionRecord;
  mode?: 'multiplayer' | 'passAndPlay';
};

function getRank(score: number): ScoreRank {
  if (score >= SCORE_RANK_THRESHOLDS.S) return 'S';
  if (score >= SCORE_RANK_THRESHOLDS.A) return 'A';
  if (score >= SCORE_RANK_THRESHOLDS.B) return 'B';
  if (score >= SCORE_RANK_THRESHOLDS.C) return 'C';
  return 'F';
}

function formatCategory(category: Category): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The API already parses the JSON arrays, but the LLM output is fragile.
 * Accept either a real array or a JSON-stringified one and fall back to
 * an empty list instead of crashing on bad shapes.
 */
function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value !== 'string') return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // Ignore malformed JSON and fall through to empty.
  }

  return [];
}

function ResultHero({
  score,
  pending,
}: {
  score: number | null;
  pending: boolean;
}) {
  const reduceMotion = useAccessibilityReduceMotion();
  const reveal = useSharedValue(0);
  const finalScore = score ?? 0;

  useEffect(() => {
    cancelAnimation(reveal);
    if (pending) {
      reveal.value = 0;
      return;
    }
    reveal.value = reduceMotion
      ? 1
      : withSpring(1, { duration: 900, dampingRatio: 0.82 });
  }, [pending, reduceMotion, reveal]);

  const separation = useDerivedValue(() => {
    const target = (1 - Math.max(0, Math.min(finalScore, 100)) / 100) * 56;
    return 56 - (56 - target) * reveal.value;
  }, [finalScore, reveal]);
  const leftStyle = useAnimatedStyle(() => ({
    opacity: pending ? 0.3 : 0.45 + reveal.value * 0.43,
    transform: [{ translateX: -separation.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: pending ? 0.3 : 0.4 + reveal.value * 0.4,
    transform: [{ translateX: separation.value }],
  }));

  const animatedProps = useAnimatedProps<{
    text: string;
    defaultValue: string;
  }>(() => {
    const text = pending
      ? '—% MATCH'
      : `${Math.round(reveal.value * finalScore)}% MATCH`;
    return { text, defaultValue: text };
  });

  return (
    <View className="items-center gap-3">
      <View className="h-32 w-40 items-center justify-center">
        <Animated.View
          className="absolute h-24 w-24 rounded-full bg-accent"
          style={leftStyle}
        />
        <Animated.View
          className="absolute h-24 w-24 rounded-full bg-text-primary"
          style={rightStyle}
        />
        <Text variant="display-xl" color="primary">
          {pending ? '·' : ''}
        </Text>
      </View>
      <AnimatedTextInput
        editable={false}
        animatedProps={animatedProps}
        className="font-display text-display-lg text-text-primary text-center bg-transparent border-0 p-0 m-0"
        underlineColorAndroid="transparent"
        caretHidden
      />
    </View>
  );
}

export default function ResultScreen({
  record,
  mode = 'multiplayer',
}: ResultScreenProps) {
  const router = useRouter();
  const { result, status, error, retry } = useResult(
    record.sessionId,
    record.playerId,
    { enableSocket: mode !== 'passAndPlay' },
  );
  const { fontsLoaded } = useAppFonts();
  const {
    viewRef: shareViewRef,
    status: shareStatus,
    share,
  } = useShareResult();
  const [playPending, setPlayPending] = useState(false);
  const pending = !result && (status === 'loading' || status === 'generating');

  const sharePending =
    shareStatus === 'capturing' ||
    shareStatus === 'sharing' ||
    shareStatus === 'saving';

  const handlePlayAgain = useCallback(async () => {
    if (playPending) return;
    setPlayPending(true);

    try {
      const { sessionId, playerId, code } = await createSession({
        category: record.category,
        questionCount: record.questionCount,
      });

      await saveSession({
        sessionId,
        playerId,
        role: 'player1',
        category: record.category,
        questionCount: record.questionCount,
        roomCode: code,
        savedAt: new Date().toISOString(),
      });

      router.replace(`/lobby/${sessionId}`);
    } catch {
      setPlayPending(false);
    }
  }, [playPending, record, router]);

  if (status === 'error' && error) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-6 px-6">
          <Text variant="display-xl" color="primary">
            X_X
          </Text>
          <Text variant="display-md" color="primary" className="text-center">
            {error}
          </Text>
          <Button title="TRY AGAIN" onPress={retry} />
        </View>
      </Screen>
    );
  }

  if (status === 'timeout' && !result) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-6 px-6">
          <Text variant="display-xl" color="primary">
            X_X
          </Text>
          <Text variant="display-md" color="primary" className="text-center">
            Still analyzing. Check your connection and try again.
          </Text>
          <Button title="RETRY" onPress={retry} />
        </View>
      </Screen>
    );
  }

  const rank = result ? getRank(result.score) : null;
  const strengths = result ? parseStringList(result.strengths) : [];
  const differences = result ? parseStringList(result.differences) : [];

  return (
    <Screen>
      <View className="flex-1">
        <ScrollView
          contentContainerClassName="flex-grow gap-6 px-6 py-8 pb-6"
          showsVerticalScrollIndicator={false}
        >
          <ResultHero score={result?.score ?? null} pending={pending} />
          <FadeInStagger index={0}>
            <View className="items-center gap-2">
              <View className="border-2 border-border-color bg-bg-card px-3 py-1">
                <Text variant="display-md" color="accent">
                  {rank ? `RANK ${rank}` : 'GENERATING'}
                </Text>
              </View>
              <Text variant="body-sm" color="muted">
                {formatCategory(record.category)}
              </Text>
              {mode === 'passAndPlay' && (
                <Text variant="body-sm" color="secondary">
                  {record.player1Name ?? 'Player 1'} &{' '}
                  {record.player2Name ?? 'Player 2'}
                </Text>
              )}
            </View>
          </FadeInStagger>

          {pending && (
            <>
              <Card>
                <View className="gap-4">
                  <Skeleton width={170} height={26} radius={4} />
                  <SkeletonText lines={4} lastLineWidth="82%" />
                </View>
              </Card>
              <Card>
                <View className="gap-4">
                  <Skeleton width={110} height={26} radius={4} />
                  <SkeletonText lines={2} lastLineWidth="60%" />
                </View>
              </Card>
            </>
          )}

          {result && (
            <FadeInStagger index={1}>
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
            </FadeInStagger>
          )}

          {strengths.length > 0 && (
            <FadeInStagger index={2}>
              <Card>
                <View className="gap-3">
                  <Text variant="display-md" color="primary">
                    STRENGTHS
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {strengths.map((strength, index) => (
                      <View
                        key={`${strength}-${index}`}
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
            </FadeInStagger>
          )}

          {differences.length > 0 && (
            <FadeInStagger index={3}>
              <Card>
                <View className="gap-3">
                  <Text variant="display-md" color="primary">
                    DIFFERENCES
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {differences.map((difference, index) => (
                      <View
                        key={`${difference}-${index}`}
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
            </FadeInStagger>
          )}
        </ScrollView>

        {result && (
          <View className="gap-3 px-6 pb-4 pt-2">
            <Button
              title={
                sharePending
                  ? 'SAVING…'
                  : !fontsLoaded
                    ? 'LOADING FONTS…'
                    : 'SHARE IMAGE'
              }
              onPress={share}
              disabled={sharePending || !fontsLoaded}
              fullWidth
            />
            <Button
              title={playPending ? 'CREATING GAME…' : 'PLAY AGAIN'}
              onPress={handlePlayAgain}
              disabled={playPending}
              fullWidth
            />
          </View>
        )}
      </View>

      {result && rank && (
        <Suspense fallback={null}>
          <LazyShareCard
            ref={shareViewRef}
            result={result}
            category={record.category}
            rank={rank}
            webUrl={env.webUrl}
          />
        </Suspense>
      )}
    </Screen>
  );
}
