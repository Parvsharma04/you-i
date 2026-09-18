import {
  SafeAreaView,
  type SafeAreaViewProps,
} from 'react-native-safe-area-context';

import { cx } from '@/lib/cx';

export type ScreenProps = SafeAreaViewProps & {
  /**
   * `false` opts out of the default `bg-bg-primary` background for screens
   * that paint their own (e.g. a full-bleed image/result card).
   */
  background?: boolean;
};

/**
 * Safe-area + themed background wrapper every screen should render at its
 * root. Web's equivalent is `.container-custom` (`globals.css`), minus the
 * fixed 480px max-width, which doesn't apply on a phone-width device.
 *
 * Web also paints a repeating dot-grid background here
 * (`background-image: linear-gradient(...) , linear-gradient(...)`,
 * see MIGRATION-AUDIT.md §3). That's cosmetic and not reproduced natively —
 * see the gradient/blur decision in the PR summary for why.
 */
export function Screen({
  background = true,
  className,
  children,
  ...props
}: ScreenProps) {
  return (
    <SafeAreaView
      className={cx(background && 'bg-bg-primary', 'flex-1', className)}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}
