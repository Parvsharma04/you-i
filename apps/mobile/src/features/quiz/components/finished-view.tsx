import { View } from 'react-native';

import type { Answer, SessionStateResponse } from '@youandi/shared';

import { Card } from '@/components/ui/card';
import { ProgressPair } from '@/components/ui/progress-pair';
import { Text } from '@/components/ui/text';

type FinishedViewProps = {
  questions: SessionStateResponse['questions'];
  answers: Answer[];
  partnerProgress: number;
  total: number;
  partnerName: string;
};

export function FinishedView({
  questions,
  answers,
  partnerProgress,
  total,
  partnerName,
}: FinishedViewProps) {
  const answerByQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer.answer]),
  );

  return (
    <View className="flex-1 gap-6 px-6 py-8">
      <View className="gap-2">
        <Text variant="display" color="primary">
          You&apos;re done.
        </Text>
        <Text variant="body" color="secondary">
          {partnerName} can still take their time. We&apos;ll show you both what
          happens next when the round is complete.
        </Text>
      </View>

      <Card style={{ gap: 14 }}>
        <Text variant="label" bold color="muted">
          YOUR ANSWERS
        </Text>
        {questions.map((question) => (
          <View key={question.id} className="gap-1">
            <Text variant="body-sm" color="secondary">
              {question.text}
            </Text>
            <Text variant="body" bold>
              {answerByQuestion.get(question.id) ?? 'Saving…'}
            </Text>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 14 }}>
        <Text variant="label" bold color="muted">
          PROGRESS
        </Text>
        <ProgressPair yours={total} theirs={partnerProgress} total={total} />
        <Text variant="body-sm" color="secondary">
          {partnerName} is on question {Math.min(partnerProgress + 1, total)}.
        </Text>
      </Card>
    </View>
  );
}
