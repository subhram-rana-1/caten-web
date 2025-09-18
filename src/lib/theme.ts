// Theme configuration for Caten Web App
export const theme = {
  colors: {
    // Main theme colors as specified
    primary: '#9527F5',
    primaryLight: '#EDDCFC', // Semi-transparent mode for badges
    background: '#FFFFFF',
    
    // Complementary colors for better visual harmony
    primaryDark: '#7C1EE8',
    primaryHover: '#A63CF7',
    
    // Semantic colors
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Text colors
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    
    // Background variations
    backgroundSecondary: '#F9FAFB',
    backgroundTertiary: '#F3F4F6',
    
    // Border colors
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    
    // Highlight colors for word selection
    highlightPurple: '#E9D5FF', // Light purple for selected words
    highlightGreen: '#D1FAE5',  // Light green for explained words
    highlightYellow: '#FEF3C7', // Yellow for search results
    
    // Interactive states
    hover: '#F3F4F6',
    focus: '#DBEAFE',
  },
  
  // Spacing scale
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  
  // Border radius
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    full: '9999px',
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      base: '1rem',    // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  
  // Animation durations
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Type for theme colors
export type ThemeColor = keyof typeof theme.colors;

// Utility function to get theme color
export const getThemeColor = (color: ThemeColor): string => {
  return theme.colors[color];
};

// CSS custom properties for dynamic theming
export const cssVariables = {
  '--color-primary': theme.colors.primary,
  '--color-primary-light': theme.colors.primaryLight,
  '--color-background': theme.colors.background,
  '--color-text-primary': theme.colors.textPrimary,
  '--color-text-secondary': theme.colors.textSecondary,
  '--color-border': theme.colors.border,
  '--color-success': theme.colors.success,
  '--color-error': theme.colors.error,
  '--color-warning': theme.colors.warning,
  '--color-info': theme.colors.info,
} as const;
