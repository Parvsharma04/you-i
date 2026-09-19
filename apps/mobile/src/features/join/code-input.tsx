import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type AppStateStatus,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

const CODE_LENGTH = 6;

function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
};

export default function CodeInput({
  value,
  onChange,
  onComplete,
  error,
  loading,
  autoFocus = true,
}: CodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const prevErrorRef = useRef(error);

  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [pasteAvailable, setPasteAvailable] = useState(false);

  const codeArray = Array.from(
    { length: CODE_LENGTH },
    (_, i) => value[i] ?? '',
  );

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  useEffect(() => {
    if (error && !prevErrorRef.current) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      triggerShake();
      setSelection({ start: 0, end: CODE_LENGTH });
      inputRef.current?.focus();
    }
    prevErrorRef.current = error;
  }, [error, triggerShake]);

  const updateValue = useCallback(
    (raw: string) => {
      const normalized = normalizeCode(raw);
      onChange(normalized);
      setSelection({
        start: Math.min(normalized.length, CODE_LENGTH),
        end: Math.min(normalized.length, CODE_LENGTH),
      });
      if (normalized.length === CODE_LENGTH) {
        onComplete?.(normalized);
      }
    },
    [onChange, onComplete],
  );

  const handleBoxPress = useCallback(
    (index: number) => {
      inputRef.current?.focus();
      const pos = Math.min(index, value.length);
      setSelection({ start: pos, end: pos });
    },
    [value.length],
  );

  const handleContainerPress = useCallback(() => {
    inputRef.current?.focus();
    setSelection({ start: value.length, end: value.length });
  }, [value.length]);

  const checkPaste = useCallback(async () => {
    const has = await Clipboard.hasStringAsync();
    setPasteAvailable(has);
  }, []);

  useEffect(() => {
    void checkPaste();
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void checkPaste();
    });
    return () => sub.remove();
  }, [checkPaste]);

  const handlePaste = useCallback(async () => {
    const raw = await Clipboard.getStringAsync();
    updateValue(raw);
    inputRef.current?.focus();
  }, [updateValue]);

  const isSelected = (index: number) =>
    selection.start !== selection.end &&
    index >= selection.start &&
    index < selection.end;

  return (
    <View>
      <Animated.View
        style={{ transform: [{ translateX: shakeAnim }] }}
        className="mb-6"
      >
        <Pressable onPress={handleContainerPress}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={updateValue}
              selection={selection}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              autoFocus={autoFocus}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              caretHidden
              editable={!loading}
              maxLength={CODE_LENGTH}
              className="h-full w-full opacity-0"
            />
          </View>

          <View className="flex-row justify-center gap-2">
            {Array.from({ length: CODE_LENGTH }, (_, i) => (
              <View
                key={i}
                className={`h-16 w-12 items-center justify-center border-3 ${
                  error
                    ? 'border-accent'
                    : selection.start === i || isSelected(i)
                      ? 'border-accent'
                      : 'border-border-color'
                } ${codeArray[i] ? 'bg-bg-card' : 'bg-bg-secondary'}`}
              >
                <Pressable onPress={() => handleBoxPress(i)}>
                  <Text
                    variant="display-md"
                    color={error ? 'accent' : 'primary'}
                    className="text-center"
                  >
                    {codeArray[i] ?? ''}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </Pressable>
      </Animated.View>

      {pasteAvailable && !loading && (
        <View className="mb-4 items-center">
          <Button title="PASTE FROM CLIPBOARD" onPress={handlePaste} />
        </View>
      )}
    </View>
  );
}
