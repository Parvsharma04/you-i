import { forwardRef, useMemo } from 'react';
import { View, type ViewProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { cx } from '@/lib/cx';
import type { Category, Result, ScoreRank } from '@youandi/shared';

const CARD_WIDTH = 360;
const CARD_HEIGHT = 640;
const GRID_SIZE = 20;

function getScoreEmoji(score: number): string {
  if (score >= 90) return '★_★';
  if (score >= 75) return '^__^';
  if (score >= 60) return '-__-';
  if (score >= 40) return 'O_O';
  return 'X_X';
}

function formatCategory(category: Category): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function GridBackground() {
  const horizontal = useMemo(
    () =>
      Array.from(
        { length: Math.floor(CARD_HEIGHT / GRID_SIZE) + 1 },
        (_, i) => i,
      ),
    [],
  );
  const vertical = useMemo(
    () =>
      Array.from(
        { length: Math.floor(CARD_WIDTH / GRID_SIZE) + 1 },
        (_, i) => i,
      ),
    [],
  );

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0 bg-bg-primary"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      {horizontal.map((i) => (
        <View
          key={`h-${i}`}
          className="absolute left-0 right-0 bg-bg-secondary"
          style={{ top: i * GRID_SIZE, height: 1 }}
        />
      ))}
      {vertical.map((i) => (
        <View
          key={`v-${i}`}
          className="absolute top-0 bottom-0 bg-bg-secondary"
          style={{ left: i * GRID_SIZE, width: 1 }}
        />
      ))}
    </View>
  );
}

function RetroShadowSurface({
  shadowSize = 4,
  className,
  children,
  ...props
}: ViewProps & { shadowSize?: number }) {
  return (
    <View className="relative">
      <View
        pointerEvents="none"
        className="absolute inset-0 bg-border-color"
        style={{
          transform: [{ translateX: shadowSize }, { translateY: shadowSize }],
        }}
      />
      <View
        className={cx('relative bg-bg-card border-border-color', className)}
        {...props}
      >
        {children}
      </View>
    </View>
  );
}

export type ShareCardProps = {
  result: Result;
  category: Category;
  rank: ScoreRank;
  /** Host app / landing page URL printed in the footer watermark. */
  webUrl: string;
};

/**
 * Off-screen 9:16 result card for `react-native-view-shot` capture.
 *
 * The card is rendered at a fixed logical size (360x640, i.e. 1080x1920 @ 3x)
 * and positioned far off-screen so it participates in layout and capture while
 * remaining invisible to the user. The root `collapsable={false}` is required
 * on Android; without it the view is optimized away and capture returns blank.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { result, category, rank, webUrl },
  ref,
) {
  const emoji = getScoreEmoji(result.score);
  const categoryLabel = formatCategory(category);
  const host = useMemo(() => {
    try {
      return new URL(webUrl).hostname.replace(/^www\./, '').toUpperCase();
    } catch {
      return 'YOUANDI.PARVSHARMA.IN';
    }
  }, [webUrl]);

  return (
    <View
      className="absolute"
      style={{ top: -9999, left: -9999 }}
      pointerEvents="none"
    >
      <View
        ref={ref}
        collapsable={false}
        className="overflow-hidden bg-bg-primary border-6 border-border-color"
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
        }}
      >
        <GridBackground />

        <View
          className="absolute inset-0 px-10 py-15 justify-between items-center"
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        >
          {/* Brand */}
          <View className="items-center gap-2 w-full">
            <RetroShadowSurface
              shadowSize={4}
              className="w-[60px] h-[60px] border-4 items-center justify-center"
            >
              <Text variant="display-md" color="accent" className="text-3xl">
                &lt;3
              </Text>
            </RetroShadowSurface>
            <Text
              variant="display-lg"
              color="accent"
              className="text-4xl tracking-[4px] uppercase mt-2"
            >
              YOU & I
            </Text>
            <Text
              variant="body-xs"
              color="muted"
              className="uppercase tracking-[2px] font-body-bold"
            >
              COMPATIBILITY OVERVIEW
            </Text>
            <Text
              variant="body-xs"
              color="secondary"
              className="uppercase tracking-[1px]"
            >
              {categoryLabel}
            </Text>
          </View>

          {/* Score */}
          <View className="items-center gap-3">
            <Text variant="display-xl" color="primary" className="text-5xl">
              {emoji}
            </Text>
            <RetroShadowSurface
              shadowSize={6}
              className="w-[130px] h-[130px] border-4 items-center justify-center"
            >
              <Text variant="display-xl" color="accent" className="text-5xl">
                {result.score}
              </Text>
            </RetroShadowSurface>
            <Text
              variant="display-lg"
              color="accent"
              className="text-3xl tracking-[2px]"
            >
              {rank}-RANK
            </Text>
            <Text
              variant="body-sm"
              color="secondary"
              className="uppercase tracking-[2px] font-body-bold"
            >
              {result.score}% MATCH
            </Text>
          </View>

          {/* Analysis */}
          <RetroShadowSurface
            shadowSize={4}
            className="w-full p-4 border-3 bg-bg-card"
          >
            <View className="gap-2">
              <Text
                variant="display-md"
                color="primary"
                className="text-base tracking-[1px]"
              >
                SYSTEM ANALYSIS
              </Text>
              <Text
                variant="body-xs"
                color="secondary"
                numberOfLines={5}
                className="leading-5"
              >
                {result.summary}
              </Text>
            </View>
          </RetroShadowSurface>

          {/* Footer watermark */}
          <Text
            variant="body-xs"
            color="muted"
            className="text-[10px] uppercase tracking-[2px] font-body-bold text-center"
          >
            TEST YOUR COMPATIBILITY AT:{' '}
            <Text
              color="accent"
              className="text-[10px] uppercase tracking-[2px] font-body-bold"
            >
              {host}
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
});
