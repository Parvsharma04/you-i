import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-card': 'var(--bg-card)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'accent': 'var(--accent-color)',
        'border-color': 'var(--border-color)',
      },
      boxShadow: {
        'retro': '4px 4px 0px var(--border-color)',
        'retro-hover': '2px 2px 0px var(--border-color)',
        'retro-active': 'none',
        'retro-sm': '3px 3px 0px var(--border-color)',
        'retro-sm-hover': '2px 2px 0px var(--border-color)',
        'retro-lg': '6px 6px 0px var(--border-color)',
        'input': 'inset 3px 3px 0px rgba(0,0,0,0.1)',
      },
      fontFamily: {
        'display': ['VT323', 'monospace'],
        'body': ['Space Mono', 'monospace'],
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      },
      animation: {
        fadeInUp: 'fadeInUp 0.8s ease forwards',
        fadeIn: 'fadeIn 0.6s ease',
        bounceIn: 'bounceIn 0.8s ease forwards',
      }
    },
  },
  plugins: [],
};
export default config;
