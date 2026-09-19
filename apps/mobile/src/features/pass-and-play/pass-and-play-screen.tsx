import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { LoadingView } from '@/components/loading-view';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ErrorView } from '@/features/quiz/components/error-view';
import { ProgressBar } from '@/features/quiz/components/progress-bar';
import { QuestionCard } from '@/features/quiz/components/question-card';
import {
  useInterceptBack,
  useLeavingIntentionally,
} from '@/hooks/useInterceptBack';
import { type SessionRecord } from '@/lib/storage';

import { usePassAndPlayQuiz } from './use-pass-and-play-quiz';

type PassAndPlayScreenProps = {
  sessionId: string;
  record: SessionRecord;
};

function HandoffView({
  currentPlayerName,
  nextPlayerName,
  onContinue,
}: {
  currentPlayerName: string;
  nextPlayerName: string;
  onContinue: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-6 px-6">
      <Text variant="display-xl" color="primary" className="text-center">
        PASS THE PHONE
      </Text>
      <Text variant="display-md" color="secondary" className="text-center">
        {currentPlayerName} is done. Hand the phone to {nextPlayerName}.
      </Text>
      <Text variant="body" color="muted" className="text-center">
        Don&apos;t worry — your answers stay hidden.
      </Text>
      <Button title="I'M READY" onPress={onContinue} />
    </View>
  );
}

export default function PassAndPlayScreen({
  sessionId,
  record,
}: PassAndPlayScreenProps) {
  const router = useRouter();
  const { leavingIntentionallyRef, markLeaving } = useLeavingIntentionally();
  const {
    phase,
    currentRole,
    isLoading,
    error,
    currentQuestion,
    currentIndex,
    totalQuestions,
    progress,
    selectedOption,
    textAnswer,
    isSubmitting,
    canSubmit,
    submitLabel,
    handleSelectOption,
    handleTextChange,
    submitCurrent,
    continueToNextPlayer,
    handleRetry,
  } = usePassAndPlayQuiz(sessionId, record, markLeaving);

  useInterceptBack(({ preventDefault }) => {
    if (leavingIntentionallyRef.current) return;
    preventDefault();
    // Pass-and-play games are fully local to this device; the user can
    // resume from the home screen, so we let the back gesture leave.
    router.replace('/');
  });

  if (isLoading) {
    return (
      <Screen>
        <LoadingView
          title="LOADING GAME…"
          subtitle="Finding whose turn it is."
        />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorView message={error.message} onRetry={handleRetry} />
      </Screen>
    );
  }

  if (phase === 'handoff' && currentRole === 'player1') {
    return (
      <Screen>
        <HandoffView
          currentPlayerName={record.player1Name ?? 'Player 1'}
          nextPlayerName={record.player2Name ?? 'Player 2'}
          onContinue={continueToNextPlayer}
        />
      </Screen>
    );
  }

  if (!currentQuestion) {
    return (
      <Screen>
        <LoadingView
          title="LOADING QUESTIONS…"
          subtitle="Getting this round ready."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <View className="flex-grow px-6 py-8">
            <View className="flex-row items-center justify-between">
              <Text variant="body-xs" bold color="muted">
                STAGE {currentIndex + 1}/{totalQuestions}
              </Text>
              <View className="border-2 border-border-color bg-bg-card px-3 py-1">
                <Text variant="body-xs" bold color="secondary">
                  {currentRole === 'player1'
                    ? (record.player1Name ?? 'PLAYER 1').toUpperCase()
                    : (record.player2Name ?? 'PLAYER 2').toUpperCase()}
                </Text>
              </View>
            </View>

            <View className="mt-2">
              <ProgressBar
                label="YOU"
                progress={progress}
                total={totalQuestions}
                variant="you"
              />
            </View>

            <View className="mt-6 flex-1">
              <QuestionCard
                question={currentQuestion}
                selectedOption={selectedOption}
                textAnswer={textAnswer}
                disabled={isSubmitting}
                onSelectOption={handleSelectOption}
                onChangeText={handleTextChange}
              />
            </View>

            <View className="mt-auto pt-4">
              <Button
                title={isSubmitting ? 'SAVING…' : submitLabel}
                onPress={submitCurrent}
                disabled={!canSubmit}
                fullWidth
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
