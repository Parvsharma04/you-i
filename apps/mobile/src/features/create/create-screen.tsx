import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CATEGORIES, type Category } from '@youandi/shared';

import { Button } from '@/components/ui/button';
import { CategoryTile, ConfirmDialog, SegmentedControl } from '@/components/ui';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/theme';

const HOME_CATEGORIES: Category[] = CATEGORIES.slice(0, 5);
const SPICY_CATEGORY = CATEGORIES[4];
const COUNT_OPTIONS = [5, 10, 20] as const;

const CATEGORY_META: Record<Category, { emoji: string; description: string }> =
  {
    love: { emoji: '♥', description: 'Romance and closeness' },
    friendship: { emoji: '✦', description: 'The friends test' },
    deep_talk: { emoji: '◌', description: 'Go beneath the surface' },
    fun: { emoji: '✳', description: 'Keep it light' },
    spicy: { emoji: '✹', description: 'For grown-up players' },
    fantasy: { emoji: '◇', description: 'Imagine the possibilities' },
    interests: { emoji: '◎', description: 'What makes you you' },
  };

function formatCategory(category: Category): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CreateScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<Category>(
    HOME_CATEGORIES[0],
  );
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [showSpicyConfirmation, setShowSpicyConfirmation] = useState(false);
  const { setCategory } = useTheme();

  const selectCategory = useCallback(
    (category: Category) => {
      void Haptics.selectionAsync();
      setSelectedCategory(category);
      setCategory(category === SPICY_CATEGORY ? 'spicy' : null);
    },
    [setCategory],
  );

  const handleSelectCategory = useCallback(
    (category: Category) => {
      if (category === SPICY_CATEGORY && selectedCategory !== SPICY_CATEGORY) {
        setShowSpicyConfirmation(true);
        return;
      }
      selectCategory(category);
    },
    [selectCategory, selectedCategory],
  );

  const handleSelectCount = useCallback((count: number) => {
    setSelectedCount(count);
  }, []);

  const handleCreateSession = useCallback(async () => {
    router.push({
      pathname: '/lobby/pending',
      params: {
        category: selectedCategory,
        questionCount: String(selectedCount),
      },
    });
  }, [router, selectedCategory, selectedCount]);

  return (
    <Screen>
      <ScrollView className="flex-1">
        <View className="flex-grow justify-center px-6 py-8">
          <Text variant="display-xl" color="primary" className="mb-2">
            Start a game
          </Text>
          <Text variant="body" color="secondary" className="mb-8">
            Pick the feeling, then the pace.
          </Text>

          <View className="mb-6">
            <Text
              variant="body-sm"
              color="muted"
              className="mb-3 uppercase tracking-widest"
            >
              Category
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {HOME_CATEGORIES.map((category) => (
                <View
                  key={category}
                  className={category === SPICY_CATEGORY ? 'w-full' : 'w-[48%]'}
                >
                  <CategoryTile
                    name={formatCategory(category)}
                    emoji={CATEGORY_META[category].emoji}
                    description={CATEGORY_META[category].description}
                    spicy={category === SPICY_CATEGORY}
                    selected={selectedCategory === category}
                    onPress={() => handleSelectCategory(category)}
                  />
                </View>
              ))}
            </View>
          </View>

          <View className="mb-8">
            <Text
              variant="body-sm"
              color="muted"
              className="mb-3 uppercase tracking-widest"
            >
              Questions
            </Text>
            <SegmentedControl
              options={COUNT_OPTIONS.map((count) => ({
                label: `${count}`,
                value: count,
              }))}
              value={selectedCount}
              onChange={handleSelectCount}
            />
          </View>

          <View className="items-center">
            <Button title="CREATE GAME" onPress={handleCreateSession} />
          </View>
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={showSpicyConfirmation}
        title="A spicier round"
        message="Spicy is for players aged 18 and over. Continue?"
        confirmLabel="I'M 18+"
        onCancel={() => setShowSpicyConfirmation(false)}
        onConfirm={() => {
          setShowSpicyConfirmation(false);
          selectCategory(SPICY_CATEGORY);
        }}
      />
    </Screen>
  );
}
