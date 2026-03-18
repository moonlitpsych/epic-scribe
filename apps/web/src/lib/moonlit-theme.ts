/**
 * Moonlit Psychiatry Design System
 * Dark mode variant aligned with CSS custom properties
 *
 * Color palette, typography, and design tokens for consistent UI
 */

export const moonlitTheme = {
  colors: {
    // Primary Colors (dark mode)
    terracotta: '#E89C8A',      // Accent warm — salmon
    navy: '#e8eaf0',            // Now used for primary text (light on dark)
    cream: '#1a1d27',           // Surface-2 background
    white: '#141720',           // Surface background

    // Secondary/Accent Colors
    tan: '#10b981',             // Primary accent — emerald (CTAs)
    softPeach: '#E89C8A',      // Accent warm
    mintGreen: '#0f2920',       // Success background
    lightCoral: '#1f0f0f',      // Error background

    // Status/Validation Colors (dark-bg versions)
    success: {
      bg: '#0f2920',
      border: '#15503d',
      text: '#34d399',
      icon: '#34d399'
    },
    warning: {
      bg: '#1f1a0f',
      border: '#4d3a14',
      text: '#fbbf24',
      icon: '#fbbf24'
    },
    error: {
      bg: '#1f0f0f',
      border: '#4d1414',
      text: '#f87171',
      icon: '#f87171'
    },
    info: {
      bg: '#0f1328',
      border: '#1e2850',
      text: '#60a5fa',
      icon: '#60a5fa'
    },

    // Text Colors (dark mode)
    text: {
      primary: '#e8eaf0',
      secondary: '#8b90a0',
      muted: '#5a5e68',
      inverse: '#0f1117'
    },

    // Neutral Colors (dark mode)
    gray: {
      50: '#1e2130',
      100: '#1a1d27',
      200: '#1e2130',
      300: '#1e2130',
      400: '#5a5e68',
      500: '#8b90a0',
      600: '#8b90a0',
      700: '#e8eaf0',
      800: '#e8eaf0',
      900: '#e8eaf0'
    }
  },

  typography: {
    fontFamily: {
      serif: '"Space Grotesk", "Inter", system-ui, sans-serif',
      sans: '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"IBM Plex Mono", "SF Mono", "Monaco", "Inconsolata", monospace'
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem'   // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
      loose: 1.75
    }
  },

  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem'    // 64px
  },

  borderRadius: {
    none: '0',
    sm: '2px',       // Minimal radius for dark theme
    md: '2px',
    lg: '2px',
    xl: '2px',
    full: '9999px'   // Pills, circular
  },

  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
    xl: 'none',
    inner: 'none'
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

// Component-specific styles
export const moonlitComponents = {
  button: {
    primary: {
      base: `
        bg-[var(--accent-primary)]
        text-[var(--text-inverse)]
        hover:bg-[var(--accent-primary-hover)]
        focus:outline-none
        focus:ring-2
        focus:ring-[var(--accent-warm)]
        focus:ring-offset-2
        transition-all
        duration-200
        rounded
        font-medium
      `,
      padding: 'px-6 py-3'
    },
    secondary: {
      base: `
        border
        border-[var(--border-default)]
        text-[var(--text-primary)]
        hover:bg-[var(--bg-hover)]
        focus:outline-none
        focus:ring-2
        focus:ring-[var(--accent-warm)]
        focus:ring-offset-2
        transition-all
        duration-200
        rounded
        font-medium
      `,
      padding: 'px-6 py-3'
    },
    tertiary: {
      base: `
        text-[var(--text-primary)]
        hover:text-[var(--accent-warm)]
        hover:bg-[var(--bg-hover)]
        focus:outline-none
        focus:ring-2
        focus:ring-[var(--accent-warm)]
        focus:ring-offset-2
        transition-all
        duration-200
        rounded
        font-medium
      `,
      padding: 'px-4 py-2'
    }
  },

  card: {
    base: `
      bg-[var(--bg-surface)]
      rounded-[2px]
      border
      border-[var(--border-default)]
      overflow-hidden
    `,
    padding: 'p-6'
  },

  modal: {
    overlay: 'fixed inset-0 bg-black/60',
    container: 'fixed inset-0 flex items-center justify-center p-4 z-50',
    content: `
      bg-[var(--bg-surface)]
      rounded-[2px]
      max-w-2xl
      w-full
      max-h-[90vh]
      overflow-hidden
      flex
      flex-col
    `,
    header: `
      px-6
      py-4
      border-b
      border-[var(--border-default)]
      bg-[var(--bg-surface-2)]
    `,
    body: 'p-6 overflow-y-auto flex-1',
    footer: 'px-6 py-4 border-t border-[var(--border-default)] bg-[var(--bg-surface-2)]'
  },

  form: {
    label: `
      block
      text-sm
      font-medium
      text-[var(--text-primary)]
      mb-1
    `,
    input: `
      w-full
      border
      border-[var(--border-default)]
      rounded
      px-4
      py-2.5
      text-[var(--text-primary)]
      bg-[var(--bg-surface-2)]
      placeholder:text-[var(--text-muted)]
      focus:ring-2
      focus:ring-[var(--accent-warm)]
      focus:border-transparent
      transition-all
      duration-200
    `,
    select: `
      w-full
      border
      border-[var(--border-default)]
      rounded
      px-4
      py-2.5
      text-[var(--text-primary)]
      bg-[var(--bg-surface-2)]
      focus:ring-2
      focus:ring-[var(--accent-warm)]
      focus:border-transparent
      transition-all
      duration-200
    `,
    textarea: `
      w-full
      border
      border-[var(--border-default)]
      rounded
      px-4
      py-2.5
      text-[var(--text-primary)]
      bg-[var(--bg-surface-2)]
      placeholder:text-[var(--text-muted)]
      focus:ring-2
      focus:ring-[var(--accent-warm)]
      focus:border-transparent
      transition-all
      duration-200
      resize-y
    `,
    helper: 'text-xs text-[var(--text-muted)] mt-1',
    error: 'text-xs text-[var(--error-text)] mt-1'
  },

  badge: {
    success: `
      inline-flex
      items-center
      px-3
      py-1
      rounded-full
      text-sm
      font-medium
      bg-[var(--success-bg)]
      text-[var(--success-text)]
    `,
    warning: `
      inline-flex
      items-center
      px-3
      py-1
      rounded-full
      text-sm
      font-medium
      bg-[var(--warning-bg)]
      text-[var(--warning-text)]
    `,
    error: `
      inline-flex
      items-center
      px-3
      py-1
      rounded-full
      text-sm
      font-medium
      bg-[var(--error-bg)]
      text-[var(--error-text)]
    `,
    info: `
      inline-flex
      items-center
      px-3
      py-1
      rounded-full
      text-sm
      font-medium
      bg-[var(--info-bg)]
      text-[var(--info-text)]
    `
  }
};

// Utility function for creating class strings
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};
