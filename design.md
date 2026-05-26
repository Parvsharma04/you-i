# Neo-Brutalist Retro 8-Bit Design System Framework
A theme-agnostic framework for building applications using a fusion of **Neo-Brutalist** layout mechanics and **8-Bit Retro Gaming** aesthetics. 

By abstracting colors into functional tokens, you can swap a single CSS variables block to instantly pivot your application from a romantic pink Valentine theme to a neon cyberpunk console, a classic Game Boy green screen, or a sleek dark-mode terminal.

---

## 🎨 Core Aesthetics & Philosophy

Regardless of the color scheme you choose, this style relies on these strict structural principles:

1. **High Physicality (Hard 3D Shadows):** All interactive elements use solid, un-blurred block shadows with a 45-degree offset. When hovered or clicked, the elements physically shift (`translate`) down and right, giving the illusion of a tactile keyboard or arcade button.
2. **Thick Outlines:** Borders are heavy and uniform (usually `3px` or `4px` wide). They frame every interactive target and card.
3. **Double Typography Hierarchy:**
   * A blocky, pixelated monospace font (e.g., **VT323**) for brand logos, headings, scoreboards, and main button actions.
   * A clean, highly legible monospace font (e.g., **Space Mono**) for questions, descriptions, inputs, and minor text.
4. **Structural Grid Backdrops:** A repeating coordinate grid runs behind all elements, emulating design blueprints or old gaming interfaces.
5. **No Rounded Edges:** Keep borders square (`rounded-none`). Rounded corners dilute the retro arcade and rigid brutalist feel.
6. **Classic Monospace Emoticons:** Denotative text emoticons (like `★_★`, `^__^`, `X_X`, `-__-`) take the place of icons or graphics to convey state.

---

## 🎨 Theme-Agnostic Color Token System

To make the design system fully reusable, colors are defined using **semantic CSS variables**. Components must never use hardcoded color values (like `#ff1493`); they must only reference these roles:

| CSS Variable | Functional Role | Tailwind Mapping |
| :--- | :--- | :--- |
| `--bg-primary` | Main page background canvas | `bg-bg-primary` |
| `--bg-secondary` | Grid lines, secondary backgrounds, and subtle tracks | `bg-bg-secondary` |
| `--bg-card` | Default background for cards, buttons, and fields | `bg-bg-card` |
| `--border-color` | Outline color for all elements and drop shadows | `border-border-color` |
| `--text-primary` | Main text color (headers, high emphasis) | `text-text-primary` |
| `--text-secondary` | Secondary text color (body text, paragraphs) | `text-text-secondary` |
| `--text-muted` | Low-priority metadata and disabled states | `text-text-muted` |
| `--accent-color` | Active highlights, selections, and focus indicators | `bg-accent`, `text-accent` |

---

## 🌈 Color Theme Presets
Simply copy any of these `:root` blocks into your CSS file to instantly transform the entire interface:

### 1. Retro Game Boy (Classic Monochrome Green)
*A nostalgia-inducing theme matching the classic dot-matrix Game Boy screen.*
```css
:root {
  --bg-primary: #8bac0f;      /* Light gray-green */
  --bg-secondary: #9bbc0f;    /* Medium gray-green (grid lines) */
  --bg-card: #c0d080;         /* Highlight screen green */
  --border-color: #0f380f;    /* Deep forest-black */
  --text-primary: #0f380f;    /* Deep forest-black */
  --text-secondary: #306230;  /* Medium forest green */
  --text-muted: #306230;      /* Medium forest green */
  --accent-color: #306230;    /* Medium forest green */
}
```

### 2. Neon Cyberpunk (Terminal / Matrix)
*High-contrast, hacker-terminal aesthetic with vibrant glow accents.*
```css
:root {
  --bg-primary: #0a0a0c;      /* Matte near-black */
  --bg-secondary: #141419;    /* Dark gray (grid lines) */
  --bg-card: #121214;         /* Charcoal card background */
  --border-color: #39ff14;    /* Electric neon green outlines */
  --text-primary: #39ff14;    /* Neon green headers */
  --text-secondary: #00ffcc;  /* Cyan body text */
  --text-muted: #008080;      /* Dark teal metadata */
  --accent-color: #ff007f;    /* Hot neon pink select state */
}
```

### 3. Love & Romance (The Original "You & I" Theme)
*Sweet pinks and deep burgundies perfect for couples and social games.*
```css
:root {
  --bg-primary: #fff0f5;      /* Lavender blush */
  --bg-secondary: #ffe4e1;    /* Misty rose (grid lines) */
  --bg-card: #ffffff;         /* Pure white cards */
  --border-color: #8b0000;    /* Dark burgundy outlines */
  --text-primary: #8b0000;    /* Dark burgundy text */
  --text-secondary: #a52a2a;  /* Brownish auburn body copy */
  --text-muted: #cd5c5c;      /* Indian red metadata */
  --accent-color: #ff1493;    /* Deep hot pink select state */
}
```

### 4. Vaporwave Sunset (80s Retro Synth)
*Sunset purples, oranges, and teals for an 80s arcade vibe.*
```css
:root {
  --bg-primary: #2d1b4e;      /* Deep violet background */
  --bg-secondary: #3d2568;    /* Lighter violet (grid lines) */
  --bg-card: #1f1235;         /* Dark purple cards */
  --border-color: #ff007f;    /* Neon pink outlines */
  --text-primary: #00ffff;    /* Cyan headers */
  --text-secondary: #ffb703;  /* Sunset yellow body text */
  --text-muted: #ff007f;      /* Pink metadata */
  --accent-color: #ffb703;    /* Sunset yellow select state */
}
```

### 5. Sunny Brutalist (High Contrast Pop)
*Classic light-mode Neo-Brutalist palette utilizing primary pops.*
```css
:root {
  --bg-primary: #fbe552;      /* Vivid yellow background */
  --bg-secondary: #e5cd2a;    /* Darker gold (grid lines) */
  --bg-card: #ffffff;         /* White cards */
  --border-color: #000000;    /* Pure black outlines/shadows */
  --text-primary: #000000;    /* Pure black headers */
  --text-secondary: #1a1a1a;  /* Dark gray body copy */
  --text-muted: #666666;      /* Medium gray metadata */
  --accent-color: #3b82f6;    /* Royal blue select state */
}
```

---

## 📐 Layout Rules & Grids

To preserve the retro feel, keep the main layout mobile-focused, centered, and aligned to a layout grid:

### 1. CSS Background Grid Construction
This grid scales automatically regardless of screen size. The grid line color matches `--bg-secondary` to remain subtle.
```css
html, body {
  min-height: 100vh;
  background-image: 
    linear-gradient(var(--bg-secondary) 1px, transparent 1px),
    linear-gradient(90deg, var(--bg-secondary) 1px, transparent 1px);
  background-size: 20px 20px;
}
```

### 2. Handheld Console Screen Container
Constraining the content simulates playing on a classic game cabinet or Game Boy Advance.
```css
.container-custom {
  width: 100%;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
```

---

## 📦 Theme-Agnostic UI Component Blueprint Library

These templates are written using **CSS variables** or **mapped Tailwind utility classes**. They will automatically update when the theme switches.

### 1. Primary Action Button (`.btn-primary`)
*Features VT323 display font, uppercase text, a 4px black-or-contrast shadow, and a physical offset translate movement when pressed.*
```html
<button className="
  inline-flex items-center justify-center gap-2 py-3 px-6 
  bg-[var(--accent-color)] text-[var(--bg-card)] 
  border-[3px] border-[var(--border-color)] 
  font-display text-2xl cursor-pointer uppercase rounded-none transition-all 
  shadow-[4px_4px_0px_var(--border-color)]
  hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_var(--border-color)]
  active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
  disabled:opacity-50 disabled:cursor-not-allowed
">
  START GAME
</button>
```

### 2. Standard Card Container (`.glass-card`)
*Flat cards with thick borders and blocky shadows.*
```html
<div className="
  bg-[var(--bg-card)] text-[var(--text-primary)] 
  border-[3px] border-[var(--border-color)] 
  shadow-[4px_4px_0px_var(--border-color)] 
  p-6 rounded-none relative transition-all
">
  <h3 className="font-display text-[1.8rem] mb-2 uppercase">SYSTEM ANALYSIS</h3>
  <p className="font-body text-[var(--text-secondary)] leading-relaxed">
    Write body content here...
  </p>
</div>
```

### 3. Selection Choice Cards (`.option-card`)
*Perfect for quiz options or selectors. Unselected options hover with a slight color change; selected options depress and invert text/background colors.*
* **Unselected State:**
  ```html
  <button className="
    w-full p-4 border-[3px] border-[var(--border-color)] 
    bg-[var(--bg-card)] text-[var(--text-primary)] 
    font-body text-base font-bold text-left rounded-none mb-3 transition-all
    shadow-[4px_4px_0px_var(--border-color)]
    hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_var(--border-color)] hover:bg-[var(--bg-secondary)]
  ">
    Option Option 1
  </button>
  ```
* **Selected State:**
  ```html
  <button className="
    w-full p-4 border-[3px] border-[var(--border-color)] 
    bg-[var(--accent-color)] text-[var(--bg-card)] 
    font-body text-base font-bold text-left rounded-none mb-3 transition-all
    translate-x-[4px] translate-y-[4px] shadow-none
  ">
    Selected Option
  </button>
  ```

### 4. Small Selector Pills (`.category-pill`)
*Compact pill buttons for lists or tags.*
* **Unselected:**
  ```html
  <button className="
    py-2 px-4 border-2 border-[var(--border-color)] 
    bg-[var(--bg-card)] text-[var(--text-primary)] 
    font-body text-[0.9rem] font-bold rounded-none transition-all
    shadow-[3px_3px_0px_var(--border-color)] 
    hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_var(--border-color)] hover:bg-[var(--bg-secondary)]
  ">
    SECTOR 7
  </button>
  ```
* **Active/Selected:**
  ```html
  <button className="
    py-2 px-4 border-2 border-[var(--border-color)] 
    bg-[var(--accent-color)] text-[var(--bg-card)] 
    font-body text-[0.9rem] font-bold rounded-none transition-all
    translate-x-[3px] translate-y-[3px] shadow-none
  ">
    SECTOR 7
  </button>
  ```

### 5. Retro Inset Inputs (`.text-input`)
*Inputs and textareas look physical by using an inner shadow instead of an outer shadow, imitating an LCD cutout.*
```html
<input 
  type="text" 
  placeholder="TYPE SOMETHING..."
  className="
    w-full p-3 bg-[var(--bg-card)] text-[var(--text-primary)] 
    border-[3px] border-[var(--border-color)] 
    font-body text-base outline-none rounded-none
    shadow-[inset_3px_3px_0px_rgba(0,0,0,0.15)]
  "
/>
```

### 6. Arcade-Style Progress Bar
*Consists of a progress frame and a matching colored fill container.*
```html
<div className="flex items-center gap-3">
  <span className="text-[0.75rem] font-bold text-[var(--text-muted)] font-body tracking-[1.5px] uppercase w-10">
    HP
  </span>
  <div className="w-full h-5 bg-[var(--bg-card)] border-2 border-[var(--border-color)] p-0.5 rounded-none">
    <div className="h-full bg-[var(--accent-color)] transition-all duration-300" style={{ width: '75%' }} />
  </div>
</div>
```

---

## 🎬 Keyframe Animations & Micro-interactions

Motion should feel blocky, fast, and digital. Instead of slow ease-in-out curves, utilize snappy, springy animations.

### 1. Page Animations Configuration
Add these animations to your Tailwind configuration file:

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      boxShadow: {
        'retro': '4px 4px 0px var(--border-color)',
        'retro-hover': '2px 2px 0px var(--border-color)',
        'retro-sm': '3px 3px 0px var(--border-color)',
        'retro-lg': '6px 6px 0px var(--border-color)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(15px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '75%': { transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      },
      animation: {
        fadeInUp: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        fadeIn: 'fadeIn 0.4s ease-out forwards',
        bounceIn: 'bounceIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      }
    }
  }
}
```

### 2. Retro UI Triggers
* **Pixel Blink:** Emulate low-frame-rate blinking text for notifications or loading indicators.
  ```css
  @keyframes blink { 
    0%, 49% { opacity: 1; } 
    50%, 100% { opacity: 0; } 
  }
  .loading-dots span {
    animation: blink 1s infinite;
  }
  ```
* **Spinning Disk / Loader:** Rotating element used for vinyl records, gears, or wheels.
  ```css
  .spinner-retro {
    animation: spin 4s linear infinite;
  }
  ```

---

## 🛠️ Implementation Steps for New Applications

### Step 1: Mapping Tailwind Extensions
Set up the custom values in your CSS variables first. Then, update `tailwind.config.ts` to map those variables to the layout configurations so you can write clean Tailwind classes:

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
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
      fontFamily: {
        'display': ['VT323', 'monospace'],
        'body': ['Space Mono', 'monospace'],
      }
    }
  }
};
export default config;
```

### Step 2: Use Strict Structural Rules
1. **Never use standard shadows:** If you find yourself writing `shadow-sm`, `shadow`, or `shadow-lg`, replace them with `shadow-retro`.
2. **Never round components:** If a card or a tag looks out of place, ensure it has `rounded-none`.
3. **Upper-case key messaging:** Always convert buttons and action headers to uppercase to preserve the system's terminal look.
4. **Use borders for dividing containers:** Do not separate content using color panels. Use thick, solid borders to isolate columns or rows.
5. **Always implement active depress offset:** Active states should always be offset by `translate-x` and `translate-y` matching the shadow thickness reduction.
