/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind only scans literal glob paths (no module-graph resolution) —
  // every dir with `className` usage must be listed or it silently drops
  // those utilities with no build error.
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Semantic surface colors. Light/dark values are driven by CSS
        // custom properties in global.css so `dark:` variants flip
        // automatically when a parent has the `.dark` class.
        surface: 'var(--color-surface)',
        card: 'var(--color-card)',
        ink: 'var(--color-ink)',
        'ink-2': 'var(--color-ink-2)',
        'ink-3': 'var(--color-ink-3)',
        line: 'var(--color-line)',
        category: {
          love: '#FF5C8A',
          friendship: '#FF9147',
          deepTalk: '#5B5BE6',
          fun: '#EFB91F',
          spicy: '#FF3D68',
        },
        // Compatibility names for existing primitives while screens migrate.
        // These alias the semantic CSS variables above.
        'bg-primary': 'var(--color-surface)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-card': 'var(--color-card)',
        'text-primary': 'var(--color-ink)',
        'text-secondary': 'var(--color-ink-2)',
        'text-muted': 'var(--color-ink-3)',
        accent: '#FF5C8A',
        'border-color': 'var(--color-line)',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5.5: '22px',
        8: '32px',
        12: '48px',
        15: '60px',
      },
      fontFamily: {
        display: ['BricolageGrotesque_400'],
        'display-600': ['BricolageGrotesque_600'],
        'display-700': ['BricolageGrotesque_700'],
        'display-800': ['BricolageGrotesque_800'],
        body: ['Figtree_400'],
        'body-600': ['Figtree_600'],
        'body-700': ['Figtree_700'],
        'body-800': ['Figtree_800'],
        'body-bold': ['Figtree_700'],
      },
      fontSize: {
        'display-xl': ['52px', { lineHeight: '58px' }],
        'display-lg': ['34px', { lineHeight: '40px' }],
        'display-md': ['24px', { lineHeight: '30px' }],
        'body-lg': ['18px', { lineHeight: '24px' }],
        base: ['16px', { lineHeight: '22px' }],
        sm: ['14px', { lineHeight: '20px' }],
        xs: ['12.5px', { lineHeight: '17px' }],
      },
      borderRadius: {
        tile: '18px',
        card: '22px',
        screen: '32px',
        full: '9999px',
      },
      borderWidth: {
        2: '2px',
        3: '3px',
        4: '4px',
        6: '6px',
      },
      boxShadow: {
        theme: '0 8px 24px -12px rgba(23,20,31,.22)',
      },
    },
  },
  plugins: [],
};
