import { Pressable, ScrollView, View } from 'react-native';
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { type Category } from '@youandi/shared';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';
import { useAccessibilityReduceMotion, useTheme } from '@/theme';
import {
  Skeleton,
  SkeletonText,
  useMinimumDuration,
} from '@/components/loading';

import { useLobbyActions } from './use-lobby-actions';
import { useLobbyState } from './use-lobby-state';

function formatCategory(category: Category): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function PresenceDot() {
  const reduceMotion = useAccessibilityReduceMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(pulse);
    pulse.value = reduceMotion
      ? 1
      : withRepeat(withTiming(1.18, { duration: 800 }), -1, true);
  }, [pulse, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.65 + (pulse.value - 1) * 2,
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View
      className="h-3 w-3 rounded-full bg-accent"
      style={animatedStyle}
    />
  );
}

export default function LobbyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Array.isArray(rawParams.sessionId)
    ? rawParams.sessionId[0]
    : rawParams.sessionId;

  const {
    status,
    setStatus,
    lobbyError,
    setLobbyError,
    category,
    questionCount,
    roomCode,
    setRoomCode,
    codeExpiresAt,
    setCodeExpiresAt,
    timeLeftMs,
    connectionLabel,
    handleErrorAction,
  } = useLobbyState(sessionId);

  const {
    copied,
    isRegenerating,
    isCancelling,
    handleCopyCode,
    handleShare,
    handleRegenerate,
    handleCancel,
  } = useLobbyActions(
    sessionId,
    roomCode,
    setRoomCode,
    setCodeExpiresAt,
    setStatus,
    setLobbyError,
  );
  const showLoading = useMinimumDuration(status === 'loading');

  if (!sessionId) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Text variant="display-md" color="primary">
            Missing game link
          </Text>
          <Button title="START NEW GAME" onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1">
        <View className="flex-grow justify-center px-6 py-8">
          {showLoading && (
            <View className="gap-6">
              <View className="items-center gap-3">
                <Skeleton width={150} height={24} radius={4} />
                <Skeleton width={230} height={42} radius={4} />
                <SkeletonText
                  lines={2}
                  lastLineWidth="78%"
                  className="w-full"
                />
              </View>
              <Card>
                <View className="gap-4">
                  <Skeleton width={110} height={18} radius={4} />
                  <Skeleton width="100%" height={72} radius={4} />
                  <SkeletonText lines={2} lastLineWidth="62%" />
                </View>
              </Card>
            </View>
          )}

          {status === 'needsCode' && (
            <View className="items-center gap-6">
              <Text
                variant="display-md"
                color="primary"
                className="text-center"
              >
                ENTER CODE ON HOME SCREEN
              </Text>
              <Text variant="body" color="secondary" className="text-center">
                Joining a game now requires a 6-character room code.
              </Text>
              <Button title="GO HOME" onPress={() => router.replace('/')} />
            </View>
          )}

          {status === 'error' && lobbyError && (
            <View className="items-center gap-6">
              <Text variant="display-xl" color="primary">
                X_X
              </Text>
              <Text
                variant="display-md"
                color="primary"
                className="text-center"
              >
                {lobbyError.message}
              </Text>
              <Button
                title={lobbyError.actionLabel}
                onPress={handleErrorAction}
              />
            </View>
          )}

          {(status === 'host' || status === 'waiting') && (
            <>
              <View className="mb-8 items-center gap-3">
                <View className="border-2 border-border-color bg-bg-card px-3 py-1">
                  <Text variant="body-sm" bold color="primary">
                    MODE: {category ? formatCategory(category) : '…'}
                  </Text>
                </View>

                <Text
                  variant="display-lg"
                  color="primary"
                  className="text-center"
                >
                  {status === 'host' ? 'WAITING FOR P2…' : 'PLAYER 2 READY'}
                </Text>

                <Text variant="body" color="secondary" className="text-center">
                  {status === 'host'
                    ? `${questionCount} STAGES · SHARE CODE TO CO-OP`
                    : 'Waiting for the host to start…'}
                </Text>
              </View>

              {status === 'host' && (
                <Card shadowSize="md" className="mb-8">
                  <View className="gap-4">
                    <Text variant="body-sm" bold color="primary">
                      ROOM CODE
                    </Text>
                    <Pressable onPress={handleCopyCode}>
                      <View className="border-3 border-border-color bg-bg-secondary p-4 active:opacity-70">
                        <Text
                          variant="mono"
                          color="primary"
                          selectable
                          className="text-center tracking-[4px]"
                          style={{
                            fontSize: 46,
                            lineHeight: 54,
                            fontFamily: 'monospace',
                          }}
                        >
                          {roomCode ?? '…'}
                        </Text>
                      </View>
                    </Pressable>
                    <Text
                      variant="body-sm"
                      color="secondary"
                      className="h-5 text-center"
                    >
                      {copied
                        ? 'COPIED!'
                        : timeLeftMs > 0
                          ? `Expires in ${formatCountdown(timeLeftMs)}`
                          : codeExpiresAt
                            ? 'CODE EXPIRED'
                            : 'Tap code to copy'}
                    </Text>

                    <View className="gap-3">
                      <Button
                        title="SHARE CODE"
                        onPress={handleShare}
                        disabled={!roomCode}
                        fullWidth
                      />
                      <Button
                        title={isRegenerating ? '…' : 'NEW CODE'}
                        onPress={handleRegenerate}
                        disabled={isRegenerating}
                        fullWidth
                      />
                      <Button
                        title={isCancelling ? '…' : 'CANCEL LOBBY'}
                        onPress={handleCancel}
                        disabled={isCancelling}
                        fullWidth
                      />
                    </View>
                  </View>
                </Card>
              )}

              {status === 'host' && roomCode && (
                <Card className="mb-8 items-center gap-4">
                  <View
                    accessible
                    accessibilityLabel="QR code for joining this room"
                  >
                    <QRCode
                      value={`${env.webUrl}/j/${roomCode}`}
                      size={168}
                      color={theme.ink}
                      backgroundColor={theme.card}
                    />
                  </View>
                  <Text
                    variant="body-sm"
                    color="secondary"
                    className="text-center"
                  >
                    Scan this to join — you&apos;ll both be in the same room.
                  </Text>
                </Card>
              )}

              <View className="items-center gap-3">
                <View className="flex-row items-center gap-2">
                  <PresenceDot />
                  <Text variant="body-sm" color="primary" bold>
                    {status === 'host'
                      ? 'WAITING FOR THEM TO JOIN'
                      : 'PLAYER 2 READY'}
                  </Text>
                </View>
                <Text variant="body-xs" color="muted">
                  {connectionLabel}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
