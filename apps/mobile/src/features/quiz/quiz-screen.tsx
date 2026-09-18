import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';

import type { PlayerRole } from '@youandi/shared';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

import { ErrorView } from './components/error-view';
import { ProgressBar } from './components/progress-bar';
import { QuestionCard } from './components/question-card';
import { WaitingView } from './components/waiting-view';
import { useQuiz } from './use-quiz';

type QuizScreenProps = {
  sessionId: string;
  playerId: string;
  role: PlayerRole;
};

export function QuizScreen({ sessionId, playerId, role }: QuizScreenProps) {
  const {
    isLoading,
    error,
    currentQuestion,
    currentIndex,
    totalQuestions,
    youProgress,
    partnerProgress,
    localComplete,
    pendingCount,
    socketStatus,
    selectedOption,
    textAnswer,
    isSubmitting,
    handleSelectOption,
    handleTextChange,
    submitCurrent,
    handleRetry,
  } = useQuiz(sessionId, playerId);

  const canSubmit =
    !isSubmitting &&
    (currentQuestion?.type === 'mcq'
      ? !!selectedOption
      : textAnswer.trim().length > 0);

  const submitLabel = currentIndex >= totalQuestions - 1 ? 'FINISH' : 'NEXT ->';

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
            {isLoading && (
              <View className="flex-1 items-center justify-center">
                <Text variant="display-md" color="primary">
                  LOADING…
                </Text>
              </View>
            )}

            {!isLoading && error && (
              <ErrorView message={error.message} onRetry={handleRetry} />
            )}

            {!isLoading && !error && localComplete && (
              <WaitingView
                partnerProgress={partnerProgress}
                total={totalQuestions}
                pendingCount={pendingCount}
                socketStatus={socketStatus}
              />
            )}

            {!isLoading && !error && !localComplete && currentQuestion && (
              <View className="flex-1 gap-6">
                <View className="flex-row items-center justify-between">
                  <Text variant="body-xs" bold color="muted">
                    STAGE {currentIndex + 1}/{totalQuestions}
                  </Text>
                  <View className="border-2 border-border-color bg-bg-card px-3 py-1">
                    <Text variant="body-xs" bold color="secondary">
                      {role === 'player1' ? 'PLAYER 1' : 'PLAYER 2'}
                    </Text>
                  </View>
                </View>

                <View className="gap-2">
                  <ProgressBar
                    label="YOU"
                    progress={youProgress}
                    total={totalQuestions}
                    variant="you"
                  />
                  <ProgressBar
                    label="P2"
                    progress={partnerProgress}
                    total={totalQuestions}
                    variant="partner"
                  />
                </View>

                <QuestionCard
                  question={currentQuestion}
                  selectedOption={selectedOption}
                  textAnswer={textAnswer}
                  disabled={isSubmitting}
                  onSelectOption={handleSelectOption}
                  onChangeText={handleTextChange}
                />

                {pendingCount > 0 && (
                  <Text
                    variant="body-sm"
                    color="accent"
                    className="text-center"
                  >
                    {pendingCount} answer{pendingCount === 1 ? '' : 's'} queued
                  </Text>
                )}

                <View className="mt-auto pt-4">
                  <Button
                    title={isSubmitting ? 'LOADING...' : submitLabel}
                    onPress={submitCurrent}
                    disabled={!canSubmit}
                    fullWidth
                  />
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
