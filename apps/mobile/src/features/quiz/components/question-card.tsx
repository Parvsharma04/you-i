import { Keyboard, TextInput, View } from 'react-native';
import { KeyboardToolbar } from 'react-native-keyboard-controller';
import { useState } from 'react';

import { OptionTile } from '@/components/ui/option-tile';
import { Text } from '@/components/ui/text';
import { MAX_TEXT_LENGTH } from '@/features/quiz/use-quiz';

import type { SessionStateResponse } from '@youandi/shared';

type Question = SessionStateResponse['questions'][number];

type QuestionCardProps = {
  question: Question;
  selectedOption: string | null;
  textAnswer: string;
  disabled?: boolean;
  onSelectOption: (option: string) => void;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
};

export function QuestionCard({
  question,
  selectedOption,
  textAnswer,
  disabled = false,
  onSelectOption,
  onChangeText,
  onSubmit,
}: QuestionCardProps) {
  const [inputHeight, setInputHeight] = useState(120);
  return (
    <View className="gap-6 bg-bg-card">
      <View className="relative overflow-hidden">
        <Text variant="display-md" color="primary" className="leading-snug">
          {question.text}
        </Text>
      </View>

      {question.type === 'mcq' && question.options ? (
        <View className="gap-1">
          {question.options.map((option, index) => (
            <OptionTile
              key={`${question.id}-${index}`}
              label={option}
              selected={selectedOption === option}
              onPress={() => onSelectOption(option)}
              disabled={disabled}
            />
          ))}
        </View>
      ) : (
        <View className="gap-2">
          <TextInput
            accessibilityLabel="Your answer"
            multiline
            maxLength={MAX_TEXT_LENGTH}
            editable={!disabled}
            value={textAnswer}
            onChangeText={onChangeText}
            onSubmitEditing={onSubmit}
            onContentSizeChange={(event) =>
              setInputHeight(
                Math.min(
                  220,
                  Math.max(120, event.nativeEvent.contentSize.height),
                ),
              )
            }
            className="border-3 border-border-color bg-bg-card p-4 font-body text-base text-text-primary"
            style={{ height: inputHeight, textAlignVertical: 'top' }}
            placeholder="TYPE YOUR ANSWER..."
            placeholderTextColor="#cd5c5c"
          />
          <Text variant="body-xs" color="muted" className="self-end">
            {textAnswer.length}/{MAX_TEXT_LENGTH}
          </Text>
          {onSubmit ? (
            <KeyboardToolbar>
              <KeyboardToolbar.Done
                text="Done"
                onPress={() => {
                  Keyboard.dismiss();
                  onSubmit();
                }}
              />
            </KeyboardToolbar>
          ) : null}
        </View>
      )}
    </View>
  );
}
