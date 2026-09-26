import { useEffect, type ReactNode } from 'react';
import { Keyboard, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { GeneratingQuestions } from '@/components/loading';
import { ProgressPair } from '@/components/ui/progress-pair';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useAccessibilityReduceMotion, motion } from '@/theme';

import { ErrorView } from './components/error-view';
import { FinishedView } from './components/finished-view';
import { QuestionCard } from './components/question-card';
import { useQuiz } from './use-quiz';

type QuizScreenProps = {
  sessionId: string;
  playerId: string;
  partnerName?: string;
};

function QuestionTransition({
  questionKey,
  children,
}: {
  questionKey: number;
  children: ReactNode;
}) {
  const reduceMotion = useAccessibilityReduceMotion();
  const translateX = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(translateX);
    if (reduceMotion) {
      translateX.value = 0;
      return;
    }
    translateX.value = 40;
    translateX.value = withSpring(0, motion.spring.standard);
  }, [questionKey, reduceMotion, translateX]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View key={questionKey} style={style}>
      {children}
    </Animated.View>
  );
}

export function QuizScreen({
  sessionId,
  playerId,
  partnerName = 'Your partner',
}: QuizScreenProps) {
  const {
    isLoading,
    error,
    currentQuestion,
    totalQuestions,
    youProgress,
    partnerProgress,
    localComplete,
    pendingCount,
    selectedOption,
    textAnswer,
    rollbackMessage,
    ownAnswers,
    questions,
    handleSelectOption,
    handleTextChange,
    submitCurrent,
    handleRetry,
  } = useQuiz(sessionId, playerId);

  const partnerQuestion = Math.min(partnerProgress + 1, totalQuestions);
  const statusCopy =
    partnerProgress >= totalQuestions
      ? `${partnerName} is done`
      : `${partnerName} is on question ${partnerQuestion}`;

  return (
    <Screen>
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        extraKeyboardSpace={16}
      >
        {isLoading && <GeneratingQuestions />}

        {!isLoading && error && (
          <ErrorView message={error.message} onRetry={handleRetry} />
        )}

        {!isLoading && !error && localComplete && (
          <FinishedView
            questions={questions}
            answers={ownAnswers}
            partnerProgress={partnerProgress}
            total={totalQuestions}
            partnerName={partnerName}
          />
        )}

        {!isLoading && !error && !localComplete && currentQuestion && (
          <View className="flex-1 gap-6 px-6 py-8">
            <View className="gap-3">
              <ProgressPair
                yours={youProgress}
                theirs={partnerProgress}
                total={totalQuestions}
              />
              <Text variant="body-xs" color="muted">
                {statusCopy}
              </Text>
            </View>

            <QuestionTransition questionKey={currentQuestion.id}>
              <QuestionCard
                question={currentQuestion}
                selectedOption={selectedOption}
                textAnswer={textAnswer}
                onSelectOption={handleSelectOption}
                onChangeText={handleTextChange}
                onSubmit={submitCurrent}
              />
            </QuestionTransition>

            {rollbackMessage && (
              <Text variant="body-sm" color="accent" className="text-center">
                {rollbackMessage}
              </Text>
            )}
            {pendingCount > 0 && (
              <Text variant="body-xs" color="muted" className="text-center">
                Answers will sync when you&apos;re back online.
              </Text>
            )}
          </View>
        )}
      </KeyboardAwareScrollView>
    </Screen>
  );
}
