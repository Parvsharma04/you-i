import { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  SCORE_RANK_THRESHOLDS,
  type Category,
  type ScoreRank,
} from '@youandi/shared';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { createSession } from '@/lib/api';
import { env } from '@/lib/env';
import { useAppFonts } from '@/lib/fonts';
import { saveSession, type SessionRecord } from '@/lib/storage';

import { useResult } from './use-result';
import { ShareCard } from './ShareCard';
import { useShareResult } from './use-share-result';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type ResultScreenProps = {
  record: SessionRecord;
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

function AnimatedScore({ finalScore }: { finalScore: number }) {
  const reduceMotion = useReducedMotion();
  const value = useSharedValue(reduceMotion ? finalScore : 0);

  useEffect(() => {
    if (reduceMotion) {
      value.value = finalScore;
    } else {
      value.value = withTiming(finalScore, {
        duration: 1500,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [finalScore, reduceMotion, value]);

  const animatedProps = useAnimatedProps<{
    text: string;
    defaultValue: string;
  }>(() => {
    const text = `${Math.round(value.value)}% MATCH`;
    return { text, defaultValue: text };
  });

  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={animatedProps}
      className="font-display text-display-lg text-text-primary text-center bg-transparent border-0 p-0 m-0"
      underlineColorAndroid="transparent"
      caretHidden
    />
  );
}

export default function ResultScreen({ record }: ResultScreenProps) {
  const router = useRouter();
  const { result, status, error, retry } = useResult(
    record.sessionId,
    record.playerId,
  );
  const { fontsLoaded } = useAppFonts();
  const {
    viewRef: shareViewRef,
    status: shareStatus,
    share,
  } = useShareResult();
  const [playPending, setPlayPending] = useState(false);

  const sharePending =
    shareStatus === 'capturing' ||
    shareStatus === 'sharing' ||
    shareStatus === 'saving';

  const handlePlayAgain = useCallback(async () => {
    if (playPending) return;
    setPlayPending(true);

    try {
      const { sessionId, player1Id } = await createSession({
        category: record.category,
        questionCount: record.questionCount,
      });

      await saveSession({
        sessionId,
        playerId: player1Id,
        role: 'player1',
        category: record.category,
        questionCount: record.questionCount,
        savedAt: new Date().toISOString(),
      });

      router.replace(`/lobby/${sessionId}`);
    } catch {
      setPlayPending(false);
    }
  }, [playPending, record, router]);

  if (status === 'loading') {
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

  if (status === 'timeout') {
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

  if (status === 'generating' || !result) {
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

  const rank = getRank(result.score);
  const strengths = parseStringList(result.strengths);
  const differences = parseStringList(result.differences);

  return (
    <Screen>
      <ScrollView contentContainerClassName="flex-grow">
        <View className="flex-grow gap-6 px-6 py-8">
          <View className="items-center gap-3">
            <View className="border-2 border-border-color bg-bg-card px-3 py-1">
              <Text variant="display-md" color="accent">
                RANK {rank}
              </Text>
            </View>
            <AnimatedScore finalScore={result.score} />
            <Text variant="body-sm" color="muted">
              {formatCategory(record.category)}
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

          {strengths.length > 0 && (
            <Card>
              <View className="gap-3">
                <Text variant="display-md" color="primary">
                  STRENGTHS
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {strengths.map((strength, index) => (
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
          )}

          {differences.length > 0 && (
            <Card>
              <View className="gap-3">
                <Text variant="display-md" color="primary">
                  DIFFERENCES
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {differences.map((difference, index) => (
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
          )}

          <View className="items-center gap-3">
            <Text variant="display-md" color="primary">
              SHARE RECORD
            </Text>
            <Button
              title={
                sharePending
                  ? 'LOADING...'
                  : !fontsLoaded
                    ? 'LOADING FONTS...'
                    : 'SHARE IMAGE'
              }
              onPress={share}
              disabled={sharePending || !fontsLoaded}
              fullWidth
            />
          </View>

          {/* TODO(phase 11): report button */}

          <View className="mt-auto pt-4">
            <Button
              title={playPending ? 'CREATING...' : 'PLAY AGAIN'}
              onPress={handlePlayAgain}
              disabled={playPending}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>

      {result && (
        <ShareCard
          ref={shareViewRef}
          result={result}
          category={record.category}
          rank={rank}
          webUrl={env.webUrl}
        />
      )}
    </Screen>
  );
}
