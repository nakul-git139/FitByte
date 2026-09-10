/**
 * FitPilot Design System & Theme Tokens
 * Warm Minimal Fitness + Human Product Design + Natural Forest Green
 */

export const Theme = {
  colors: {
    // Core Brand Palette
    background: '#F7F6F2', // Warm Off-White
    surface: '#FFFFFF', // Pure White Card Background
    surfaceSecondary: '#EFECE6', // Soft secondary surface
    surfaceElevated: '#FFFFFF',
    
    // Text Hierarchy
    textPrimary: '#1C1C1A', // Deep Charcoal
    textSecondary: '#6E6E68', // Soft Gray
    textMuted: '#9B9B94', // Muted Gray
    textInverse: '#FFFFFF',
    
    // Natural Green Branding
    primaryGreen: '#1F6B4F', // Natural Forest Green
    primaryGreenDark: '#16503B', // Deep Forest Green
    lightGreen: '#DCEDE4', // Soft Sage/Mint Green
    accentGreen: '#2F8A64', // Vibrant Emerald Leaf
    greenGlow: 'rgba(31, 107, 79, 0.12)',
    
    // Subtle Borders & Dividers
    borderSubtle: '#E8E6E0',
    borderLight: '#F0EEE8',
    borderActive: '#1F6B4F',
    
    // Status & Accent Colors
    warning: '#D97706',
    warningLight: '#FEF3C7',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    info: '#2563EB',
    infoLight: '#DBEAFE',
    
    // Dark Camera Mode Overlays
    cameraDarkBg: '#0F172A',
    cameraHudCard: 'rgba(15, 23, 42, 0.85)',
    cameraHudBorder: 'rgba(255, 255, 255, 0.12)',
  },

  typography: {
    fontFamily: {
      sans: 'System',
    },
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 17,
      lg: 20,
      xl: 24,
      xxl: 28,
      hero: 34,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    xxxl: 40,
  },

  borderRadius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    full: 9999,
  },

  shadows: {
    soft: {
      shadowColor: '#1C1C1A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    card: {
      shadowColor: '#1C1C1A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    elevated: {
      shadowColor: '#1F6B4F',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 5,
    },
  },
};

export type AppTheme = typeof Theme;
