/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind only scans literal glob paths (no module-graph resolution) —
  // every dir with `className` usage must be listed or it silently drops
  // those utilities with no build error.
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // 1:1 port of the live "Love & Romance" theme in
      // apps/web/src/app/globals.css `:root` + apps/web/tailwind.config.ts.
      // These are the only tokens actually shipped on web — the four
      // inactive presets documented in design.md are not ported.
      colors: {
        'bg-primary': '#fff0f5',
        'bg-secondary': '#ffe4e1',
        'bg-card': '#ffffff',
        'text-primary': '#8b0000',
        'text-secondary': '#a52a2a',
        'text-muted': '#cd5c5c',
        accent: '#ff1493',
        'border-color': '#8b0000',
      },
      // Web's `.container-custom` max-width, the results share-card size,
      // and the raw arbitrary spacing values pulled from components
      // (see audit §3, "Spacing / sizing scale actually used").
      spacing: {
        4.5: '18px',
        15: '60px',
      },
      fontFamily: {
        // Loaded natively via @expo-google-fonts/vt323 and
        // @expo-google-fonts/space-mono (see src/lib/fonts.ts) instead of
        // web's Google Fonts @import — same families, same two weights.
        display: ['VT323_400Regular', 'monospace'],
        body: ['SpaceMono_400Regular', 'monospace'],
        'body-bold': ['SpaceMono_700Bold', 'monospace'],
      },
      // h1/h2/h3 sizes from globals.css `@layer base`, plus the smaller
      // literal sizes (`0.9rem`, `0.85rem`) used across pills/tags/shares.
      fontSize: {
        'display-xl': ['60px', { lineHeight: '64px', letterSpacing: 2 }], // h1: text-6xl
        'display-lg': ['40px', { lineHeight: '44px', letterSpacing: 1 }], // h2: 2.5rem
        'display-md': ['28.8px', { lineHeight: '32px', letterSpacing: 0 }], // h3: 1.8rem
        base: ['16px', { lineHeight: '22px' }],
        sm: ['14.4px', { lineHeight: '20px' }], // 0.9rem — pills/category text
        xs: ['13.6px', { lineHeight: '18px' }], // 0.85rem — tags
      },
      // Hard design invariant per design.md "No Rounded Edges": every
      // surface is `rounded-none`; `full` is reserved for the spinner and
      // the CD/vinyl icon, the only two circular elements on web.
      borderRadius: {
        none: '0px',
        full: '9999px',
      },
      borderWidth: {
        2: '2px',
        3: '3px',
        4: '4px',
        6: '6px',
      },
      // Web's hard-edge "retro" shadows (`4px 4px 0px var(--border-color)`,
      // no blur) can't be expressed as a real RN shadow — RN box-shadows are
      // always blurred/soft. These tokens exist for reference/web parity;
      // components/ui/* fake the effect with an offset border layer instead
      // of applying `shadow-retro` directly. See components/ui/card.tsx.
      boxShadow: {
        retro: '4px 4px 0px #8b0000',
        'retro-hover': '2px 2px 0px #8b0000',
        'retro-sm': '3px 3px 0px #8b0000',
        'retro-lg': '6px 6px 0px #8b0000',
      },
    },
  },
  plugins: [],
};
