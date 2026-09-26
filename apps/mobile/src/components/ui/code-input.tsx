import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAccessibilityReduceMotion } from '@/theme';
import { useTheme } from '@/theme';

import { Text } from './text';
import { Button } from './button';

const CODE_LENGTH = 6;

export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

export type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  pending?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
};

export function CodeInput({
  value,
  onChange,
  onComplete,
  error = false,
  pending = false,
  autoFocus = true,
  accessibilityLabel = 'Six character game code',
}: CodeInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const reduceMotion = useAccessibilityReduceMotion();
  const shake = useSharedValue(0);
  const [selection, setSelection] = useState({
    start: value.length,
    end: value.length,
  });
  const [pasteAvailable, setPasteAvailable] = useState(false);
  const previousError = useRef(error);
  const chars = useMemo(
    () => Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? ''),
    [value],
  );

  useEffect(() => {
    if (error && !previousError.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake.value = reduceMotion
        ? 0
        : withSequence(
            withTiming(6, { duration: 40 }),
            withTiming(-6, { duration: 80 }),
            withTiming(6, { duration: 80 }),
            withTiming(0, { duration: 120 }),
          );
      setSelection({ start: 0, end: value.length });
      inputRef.current?.focus();
    }
    previousError.current = error;
  }, [error, reduceMotion, shake, value.length]);

  useEffect(() => {
    let mounted = true;
    void Clipboard.hasStringAsync().then((hasString) => {
      if (mounted) setPasteAvailable(hasString);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback(
    (raw: string) => {
      const next = normalizeCode(raw);
      onChange(next);
      const cursor = Math.min(next.length, CODE_LENGTH);
      setSelection({ start: cursor, end: cursor });
      if (next.length === CODE_LENGTH) onComplete?.(next);
    },
    [onChange, onComplete],
  );

  const handleKeyPress = useCallback(
    ({ nativeEvent }: { nativeEvent: { key: string } }) => {
      if (
        nativeEvent.key === 'Backspace' &&
        selection.start === selection.end &&
        selection.start > 0
      ) {
        const next =
          value.slice(0, selection.start - 1) + value.slice(selection.start);
        onChange(next);
        setSelection({ start: selection.start - 1, end: selection.start - 1 });
      }
    },
    [onChange, selection, value],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const handlePaste = useCallback(async () => {
    const pasted = await Clipboard.getStringAsync();
    update(pasted);
    inputRef.current?.focus();
  }, [update]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={pending}
        onPress={() => inputRef.current?.focus()}
        style={{ minHeight: 64 }}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={update}
          onKeyPress={handleKeyPress}
          selection={selection}
          onSelectionChange={(event) =>
            setSelection(event.nativeEvent.selection)
          }
          autoFocus={autoFocus}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          caretHidden
          editable={!pending}
          maxLength={CODE_LENGTH}
          accessibilityLabel={accessibilityLabel}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        />
        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}
        >
          {chars.map((char, index) => {
            const selected = selection.start <= index && index < selection.end;
            return (
              <View
                key={index}
                style={{
                  width: 44,
                  height: 56,
                  minWidth: 44,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: error || selected ? theme.ink : theme.line,
                  backgroundColor: theme.card,
                }}
              >
                <Text
                  variant="title"
                  accessibilityLabel={`Character ${index + 1}`}
                >
                  {char}
                </Text>
              </View>
            );
          })}
        </View>
      </Pressable>
      {pasteAvailable && !pending ? (
        <View className="mt-4 items-center">
          <Button title="PASTE FROM CLIPBOARD" onPress={handlePaste} />
        </View>
      ) : null}
    </Animated.View>
  );
}
