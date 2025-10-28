/**
 * Moonlit Psychiatry Design System
 * Based on the Moonlit Style Guide
 *
 * Color palette, typography, and design tokens for consistent UI
 */

export const moonlitTheme = {
  colors: {
    // Primary Colors
    terracotta: '#E89C8A',      // Logo dots, accent elements
    navy: '#0A1F3D',             // Headlines, primary text
    cream: '#F5F1ED',            // Primary background
    white: '#FFFFFF',            // Secondary background

    // Secondary/Accent Colors
    tan: '#C5A882',              // Primary buttons, selected states
    softPeach: '#F5C8B3',        // Highlights, emphasis
    mintGreen: '#D4F1E8',        // Success, "Accepting New Patients"
    lightCoral: '#F5D6C8',       // Warnings, "Established Only"

    // Status/Validation Colors (Moonlit-adjusted)
    success: {
      bg: '#D4F1E8',             // Mint green background
      border: '#9FD7C8',         // Slightly darker mint
      text: '#1B5E4A',           // Dark green text
      icon: '#2B8066'            // Icon color
    },
    warning: {
      bg: '#F5E6D3',             // Warm cream/peach
      border: '#E5C4A8',         // Darker tan/peach
      text: '#8B5A2B',           // Warm brown text
      icon: '#B67C4E'            // Icon color
    },
    error: {
      bg: '#F5D6C8',             // Light coral
      border: '#E5A890',         // Darker coral
      text: '#8B3A3A',           // Deep red-brown text
      icon: '#C65D5D'            // Icon color
    },
    info: {
      bg: '#E8E5F5',             // Light lavender
      border: '#C4BDE5',         // Darker lavender
      text: '#4A3F7A',           // Deep purple text
      icon: '#6B5FA8'            // Icon color
    },

    // Text Colors
    text: {
      primary: '#0A1F3D',        // Navy blue
      secondary: '#4A5568',      // Muted gray-blue
      muted: '#718096',          // Light gray
      inverse: '#FFFFFF'         // White text on dark backgrounds
    },

    // Neutral Colors
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827'
    }
  },

  typography: {
    fontFamily: {
      serif: '"Baskerville", "Georgia", "Times New Roman", serif',
      sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace'
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
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px'   // Pills, circular
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(10, 31, 61, 0.05)',
    md: '0 4px 6px -1px rgba(10, 31, 61, 0.07), 0 2px 4px -1px rgba(10, 31, 61, 0.04)',
    lg: '0 10px 15px -3px rgba(10, 31, 61, 0.08), 0 4px 6px -2px rgba(10, 31, 61, 0.03)',
    xl: '0 20px 25px -5px rgba(10, 31, 61, 0.08), 0 10px 10px -5px rgba(10, 31, 61, 0.02)',
    inner: 'inset 0 2px 4px 0 rgba(10, 31, 61, 0.04)'
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
        bg-[${moonlitTheme.colors.tan}]
        text-white
        hover:bg-[#B59872]
        focus:outline-none
        focus:ring-2
        focus:ring-[${moonlitTheme.colors.tan}]
        focus:ring-offset-2
        transition-all
        duration-200
        rounded-lg
        font-medium
        shadow-sm
        hover:shadow-md
      `,
      padding: 'px-6 py-3'
    },
    secondary: {
      base: `
        border
        border-[${moonlitTheme.colors.tan}]
        text-[${moonlitTheme.colors.tan}]
        hover:bg-[${moonlitTheme.colors.cream}]
        focus:outline-none
        focus:ring-2
        focus:ring-[${moonlitTheme.colors.tan}]
        focus:ring-offset-2
        transition-all
        duration-200
        rounded-lg
        font-medium
      `,
      padding: 'px-6 py-3'
    },
    tertiary: {
      base: `
        text-[${moonlitTheme.colors.navy}]
        hover:text-[${moonlitTheme.colors.terracotta}]
        hover:bg-[${moonlitTheme.colors.cream}]
        focus:outline-none
        focus:ring-2
        focus:ring-[${moonlitTheme.colors.terracotta}]
        focus:ring-offset-2
        transition-all
        duration-200
        rounded-lg
        font-medium
      `,
      padding: 'px-4 py-2'
    }
  },

  card: {
    base: `
      bg-white
      rounded-xl
      shadow-md
      border
      border-gray-100
      overflow-hidden
    `,
    padding: 'p-6'
  },

  modal: {
    overlay: 'fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm',
    container: 'fixed inset-0 flex items-center justify-center p-4 z-50',
    content: `
      bg-white
      rounded-xl
      shadow-xl
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
      border-gray-200
      bg-[${moonlitTheme.colors.cream}]
    `,
    body: 'p-6 overflow-y-auto flex-1',
    footer: 'px-6 py-4 border-t border-gray-200 bg-gray-50'
  },

  form: {
    label: `
      block
      text-sm
      font-medium
      text-[${moonlitTheme.colors.navy}]
      mb-1
    `,
    input: `
      w-full
      border
      border-gray-300
      rounded-lg
      px-4
      py-2.5
      text-gray-900
      placeholder-gray-400
      focus:ring-2
      focus:ring-[${moonlitTheme.colors.terracotta}]
      focus:border-transparent
      transition-all
      duration-200
    `,
    select: `
      w-full
      border
      border-gray-300
      rounded-lg
      px-4
      py-2.5
      text-gray-900
      focus:ring-2
      focus:ring-[${moonlitTheme.colors.terracotta}]
      focus:border-transparent
      transition-all
      duration-200
      bg-white
    `,
    textarea: `
      w-full
      border
      border-gray-300
      rounded-lg
      px-4
      py-2.5
      text-gray-900
      placeholder-gray-400
      focus:ring-2
      focus:ring-[${moonlitTheme.colors.terracotta}]
      focus:border-transparent
      transition-all
      duration-200
      resize-y
    `,
    helper: 'text-xs text-gray-500 mt-1',
    error: 'text-xs text-red-600 mt-1'
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
      bg-[${moonlitTheme.colors.success.bg}]
      text-[${moonlitTheme.colors.success.text}]
    `,
    warning: `
      inline-flex
      items-center
      px-3
      py-1
      rounded-full
      text-sm
      font-medium
      bg-[${moonlitTheme.colors.warning.bg}]
      text-[${moonlitTheme.colors.warning.text}]
    `,
    error: `
      inline-flex
      items-center
      px-3
      py-1
      rounded-full
      text-sm
      font-medium
      bg-[${moonlitTheme.colors.error.bg}]
      text-[${moonlitTheme.colors.error.text}]
    `,
    info: `
      inline-flex
      items-center
      px-3
      py-1
      rounded-full
      text-sm
      font-medium
      bg-[${moonlitTheme.colors.info.bg}]
      text-[${moonlitTheme.colors.info.text}]
    `
  }
};

// Utility function for creating class strings
export const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};