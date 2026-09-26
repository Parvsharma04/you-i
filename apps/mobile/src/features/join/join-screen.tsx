import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, CodeInput, normalizeCode } from '@/components/ui';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  joinSessionByCode,
} from '@/lib/api';
import { env } from '@/lib/env';
import { saveSession } from '@/lib/storage';

const CODE_LENGTH = 6;

function messageForError(err: unknown): string {
  if (err instanceof NetworkError || err instanceof TimeoutError) {
    return "You're offline. Check your connection and try again.";
  }
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'CODE_NOT_FOUND':
        return 'Game not found. Check the code and try again.';
      case 'CODE_EXPIRED':
        return 'This code has expired. Ask the host for a new one.';
      case 'SESSION_FULL':
        return 'That game is full.';
      case 'SESSION_FINISHED':
        return 'That game has already finished.';
      case 'SELF_JOIN':
        return "You can't join your own game.";
      case 'RATE_LIMITED':
        return 'Too many attempts. Take a break and try again.';
      case 'ALREADY_JOINED':
        return 'You are already in this game.';
      default:
        return err.message;
    }
  }
  return 'Could not join. Try again.';
}

type JoinScreenProps = {
  initialCode?: string;
  autoSubmit?: boolean;
};

export default function JoinScreen({
  initialCode = '',
  autoSubmit = false,
}: JoinScreenProps) {
  const router = useRouter();
  const autoSubmitRef = useRef(
    autoSubmit && normalizeCode(initialCode).length === CODE_LENGTH,
  );

  const [code, setCode] = useState(normalizeCode(initialCode));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (codeToSubmit: string) => {
      if (isLoading || codeToSubmit.length !== CODE_LENGTH) return;
      setIsLoading(true);
      setError(null);
      try {
        const joined = await joinSessionByCode(codeToSubmit);
        await saveSession({
          sessionId: joined.sessionId,
          playerId: joined.playerId,
          role: joined.role,
          category: joined.category,
          questionCount: joined.questionCount,
          savedAt: new Date().toISOString(),
        });
        router.replace(`/lobby/${joined.sessionId}`);
      } catch (err) {
        setIsLoading(false);
        setError(messageForError(err));
      }
    },
    [isLoading, router],
  );

  useEffect(() => {
    if (autoSubmitRef.current) {
      autoSubmitRef.current = false;
      const normalized = normalizeCode(initialCode);
      if (normalized.length === CODE_LENGTH) {
        void submit(normalized);
      }
    }
  }, [initialCode, submit]);

  const handleShare = useCallback(async () => {
    if (code.length !== CODE_LENGTH) return;
    const link = `${env.webUrl}/j/${code}`;
    await Share.share({
      message: `Join my game: ${code}\n${link}`,
    });
  }, [code]);

  return (
    <Screen>
      <View className="flex-1 justify-center px-6 py-8">
        <Text variant="display-xl" color="primary" className="mb-2 text-center">
          ENTER CODE
        </Text>
        <Text variant="body" color="secondary" className="mb-8 text-center">
          Type or paste the 6-character room code.
        </Text>

        <CodeInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          error={error !== null}
          pending={isLoading}
          autoFocus={!autoSubmit}
        />

        {error && (
          <Text variant="body-sm" color="accent" className="mb-6 text-center">
            {error}
          </Text>
        )}

        <View className="mb-8 items-center">
          <Button
            title={isLoading ? 'JOINING…' : 'JOIN GAME'}
            onPress={() => submit(code)}
            disabled={isLoading || code.length !== CODE_LENGTH}
          />
        </View>

        {code.length === CODE_LENGTH && (
          <View className="items-center">
            <Button
              title="SHARE THIS CODE"
              onPress={handleShare}
              disabled={isLoading}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
