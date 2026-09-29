/**
 * Design tokens for the You & I mobile app.
 *
 * All values are expressed as Tailwind class names so components stay
 * consistent and theme-aware. Prefer importing from here instead of
 * hard-coding spacing, sizing, typography, or color classes.
 *
 * The app uses NativeWind with a custom theme (see tailwind.config.js),
 * so some tokens reference custom utilities such as `rounded-card`,
 * `gap-5.5`, and `text-display-xl`.
 */

// ----------------------------------------------------------------------------
// SPACING — gap, padding, margin
// ----------------------------------------------------------------------------

export const SPACING = {
  /** 4px — tightest spacing, e.g. icon gaps */
  xs: 'gap-1',
  /** 8px — small spacing, e.g. inline element gaps */
  sm: 'gap-2',
  /** 12px — default compact spacing */
  md: 'gap-3',
  /** 16px — default comfortable spacing */
  lg: 'gap-4',
  /** 22px — card internal padding (custom token) */
  xl: 'p-5.5',
  /** 32px — section padding / large gaps */
  '2xl': 'gap-8',
  /** 48px — extra large gaps */
  '3xl': 'gap-12',
  /** 60px — largest gaps, e.g. hero spacing */
  '4xl': 'gap-15',
} as const;

/** Horizontal screen padding used by `Screen` and most screen roots. */
export const SCREEN_PADDING = {
  x: 'px-6',
  y: 'py-8',
} as const;

/** Consistent padding for cards, controls, and compact labels. */
export const PADDING = {
  card: 'p-4',
  control: 'p-4',
  chip: 'px-3 py-1',
} as const;

// ----------------------------------------------------------------------------
// SIZING — heights, widths, border radius
// ----------------------------------------------------------------------------

export const SIZING = {
  /** Primary button height (56px). */
  buttonHeight: 'h-14',
  /** Standard text input height (56px). */
  inputHeight: 'h-14',
  /** Compact input height for code boxes (64px). */
  codeInputHeight: 'h-16',
  /** Small square touch target (48px). */
  touchMin: 'h-12 w-12',
  /** Card border radius (22px). */
  cardRadius: 'rounded-card',
  /** Tile / option / segment border radius (18px). */
  tileRadius: 'rounded-tile',
  /** Screen-level border radius (32px). */
  screenRadius: 'rounded-screen',
  /** Full pill / circle radius. */
  fullRadius: 'rounded-full',
} as const;

// ----------------------------------------------------------------------------
// TYPOGRAPHY — text sizes and weights
// ----------------------------------------------------------------------------

export const TYPOGRAPHY = {
  /** 52px display, e.g. score, hero numbers */
  displayXl: 'text-display-xl',
  /** 34px display, e.g. large headings */
  displayLg: 'text-display-lg',
  /** 24px display, e.g. question text, section headings */
  displayMd: 'text-display-md',
  /** 24px title, e.g. card titles */
  title: 'text-title',
  /** 18px large body */
  bodyLg: 'text-body-lg',
  /** 16px default body */
  body: 'text-base',
  /** 14px small body / button label */
  bodySm: 'text-sm',
  /** 12.5px captions, metadata */
  bodyXs: 'text-xs',
  /** 14px label, used by Button component */
  label: 'text-label',
  /** Monospace text, e.g. room codes */
  mono: 'text-mono',
} as const;

export const FONT_WEIGHT = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;

// ----------------------------------------------------------------------------
// GAPS — spacing between sections and elements
// ----------------------------------------------------------------------------

export const GAPS = {
  /** 12px — tight grouping, e.g. label + input */
  tight: 'gap-3',
  /** 16px — default card content grouping */
  default: 'gap-4',
  /** 20px — small section separation */
  relaxed: 'gap-5',
  /** 24px — standard section separation */
  section: 'gap-6',
  /** 32px — large section separation before primary actions */
  large: 'gap-8',
} as const;

export const SECTION_MARGIN = {
  /** 24px — space between related sections */
  related: 'mb-6',
  /** 12px — space under small section labels */
  label: 'mb-3',
  /** 16px — space around inline status messages */
  message: 'mt-4',
  /** 32px — space before primary actions */
  beforeAction: 'mb-8',
  /** 40px — space below major headings */
  heading: 'mb-10',
} as const;

// ----------------------------------------------------------------------------
// COLORS — semantic light/dark color classes
// ----------------------------------------------------------------------------

/**
 * Semantic background colors. These map to CSS custom properties in
 * global.css and automatically adapt in dark mode.
 */
export const BACKGROUND = {
  /** Main app background */
  surface: 'bg-surface',
  /** Card / elevated surface background */
  card: 'bg-card',
  /** Secondary surface, e.g. chips, progress tracks */
  secondary: 'bg-bg-secondary',
  /** Primary surface, legacy alias for bg-surface */
  primary: 'bg-bg-primary',
} as const;

/**
 * Semantic text colors. These map to CSS custom properties in global.css
 * and automatically adapt in dark mode.
 */
export const TEXT = {
  /** Primary text */
  primary: 'text-text-primary',
  /** Secondary text */
  secondary: 'text-text-secondary',
  /** Muted / tertiary text */
  muted: 'text-text-muted',
  /** Accent / category color text */
  accent: 'text-accent',
} as const;

/**
 * Semantic border colors. These map to CSS custom properties in global.css
 * and automatically adapt in dark mode.
 */
export const BORDER = {
  /** Default border color */
  default: 'border-border-color',
  /** Accent border for error / selected states */
  accent: 'border-accent',
} as const;

// ----------------------------------------------------------------------------
// COMPOSITE TOKENS — common component patterns
// ----------------------------------------------------------------------------

/** Standard card container class combination. */
export const CARD = {
  container: `${SIZING.cardRadius} ${BACKGROUND.card}`,
  padding: PADDING.card,
} as const;

/** Standard button class combination. */
export const BUTTON = {
  height: SIZING.buttonHeight,
  radius: SIZING.tileRadius,
  text: TYPOGRAPHY.label,
} as const;

/** Standard screen root class combination. */
export const SCREEN = {
  padding: `${SCREEN_PADDING.x} ${SCREEN_PADDING.y}`,
  gap: GAPS.section,
} as const;
