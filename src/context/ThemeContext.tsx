import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════
// 🎨 PALETTES DE COULEURS
// ═══════════════════════════════════════════════════════════════

export const THEMES = {
  violet: {
    name: 'Original',
    emoji: '💜',
    primary: '#7C3AED',
    primaryLight: '#A78BFA',
    primaryDark: '#5B21B6',
    secondary: '#EDE9FE',
    secondaryDark: '#DDD6FE',
    accent: '#8B5CF6',
    gradient: ['#7C3AED', '#A78BFA'],
    gradientDark: ['#5B21B6', '#7C3AED'],
    shimmer: ['#EDE9FE', '#F5F3FF', '#EDE9FE'],
  },
  rose: {
    name: 'Rose',
    emoji: '🌸',
    primary: '#EC4899',
    primaryLight: '#F472B6',
    primaryDark: '#BE185D',
    secondary: '#FCE7F3',
    secondaryDark: '#FBCFE8',
    accent: '#F472B6',
    gradient: ['#EC4899', '#F472B6'],
    gradientDark: ['#BE185D', '#EC4899'],
    shimmer: ['#FCE7F3', '#FDF2F8', '#FCE7F3'],
  },
  framboise: {
    name: 'Framboise',
    emoji: '🍇',
    primary: '#E91E63',
    primaryLight: '#F06292',
    primaryDark: '#AD1457',
    secondary: '#FCE4EC',
    secondaryDark: '#F8BBD9',
    accent: '#F06292',
    gradient: ['#E91E63', '#F06292'],
    gradientDark: ['#AD1457', '#E91E63'],
    shimmer: ['#FCE4EC', '#FFF0F5', '#FCE4EC'],
  },
  ocean: {
    name: 'Océan',
    emoji: '🌊',
    primary: '#0284C7',
    primaryLight: '#38BDF8',
    primaryDark: '#0369A1',
    secondary: '#E0F2FE',
    secondaryDark: '#BAE6FD',
    accent: '#0EA5E9',
    gradient: ['#0284C7', '#38BDF8'],
    gradientDark: ['#0369A1', '#0284C7'],
    shimmer: ['#E0F2FE', '#F0F9FF', '#E0F2FE'],
  },
  amber: {
    name: 'Soleil',
    emoji: '☀️',
    primary: '#D97706',
    primaryLight: '#FBBF24',
    primaryDark: '#B45309',
    secondary: '#FEF3C7',
    secondaryDark: '#FDE68A',
    accent: '#F59E0B',
    gradient: ['#D97706', '#FBBF24'],
    gradientDark: ['#B45309', '#D97706'],
    shimmer: ['#FEF3C7', '#FFFBEB', '#FEF3C7'],
  },
  green: {
    name: 'Émeraude',
    emoji: '💎',
    primary: '#059669',
    primaryLight: '#34D399',
    primaryDark: '#047857',
    secondary: '#D1FAE5',
    secondaryDark: '#A7F3D0',
    accent: '#10B981',
    gradient: ['#059669', '#34D399'],
    gradientDark: ['#047857', '#059669'],
    shimmer: ['#D1FAE5', '#ECFDF5', '#D1FAE5'],
  },
  jaune: {
    name: 'Citron',
    emoji: '🍋',
    primary: '#CA8A04',
    primaryLight: '#FACC15',
    primaryDark: '#A16207',
    secondary: '#FEF9C3',
    secondaryDark: '#FEF08A',
    accent: '#EAB308',
    gradient: ['#CA8A04', '#FACC15'],
    gradientDark: ['#A16207', '#CA8A04'],
    shimmer: ['#FEF9C3', '#FEFCE8', '#FEF9C3'],
  },
  rouge: {
    name: 'Passion',
    emoji: '❤️',
    primary: '#DC2626',
    primaryLight: '#F87171',
    primaryDark: '#B91C1C',
    secondary: '#FEE2E2',
    secondaryDark: '#FECACA',
    accent: '#EF4444',
    gradient: ['#DC2626', '#F87171'],
    gradientDark: ['#B91C1C', '#DC2626'],
    shimmer: ['#FEE2E2', '#FEF2F2', '#FEE2E2'],
  },
  beige: {
    name: 'Nature',
    emoji: '🌾',
    primary: '#A8763E',
    primaryLight: '#D4A373',
    primaryDark: '#8B5E2B',
    secondary: '#FDF6E3',
    secondaryDark: '#FAEDCD',
    accent: '#DDA15E',
    gradient: ['#A8763E', '#DDA15E'],
    gradientDark: ['#8B5E2B', '#A8763E'],
    shimmer: ['#FDF6E3', '#FFFBF0', '#FDF6E3'],
  },
  brown: {
    name: 'Café',
    emoji: '☕',
    primary: '#78350F',
    primaryLight: '#A16207',
    primaryDark: '#451A03',
    secondary: '#FEF3C7',
    secondaryDark: '#FDE68A',
    accent: '#92400E',
    gradient: ['#78350F', '#A16207'],
    gradientDark: ['#451A03', '#78350F'],
    shimmer: ['#FEF3C7', '#FFFBEB', '#FEF3C7'],
  },
  indigo: {
    name: 'Nuit',
    emoji: '🌙',
    primary: '#4338CA',
    primaryLight: '#6366F1',
    primaryDark: '#3730A3',
    secondary: '#E0E7FF',
    secondaryDark: '#C7D2FE',
    accent: '#818CF8',
    gradient: ['#4338CA', '#818CF8'],
    gradientDark: ['#3730A3', '#4338CA'],
    shimmer: ['#E0E7FF', '#EEF2FF', '#E0E7FF'],
  },
};

export type ThemeKey = keyof typeof THEMES;

// ═══════════════════════════════════════════════════════════════
// 📐 DESIGN TOKENS - FORMES ET DIMENSIONS
// ═══════════════════════════════════════════════════════════════

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
} as const;

export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  full: 9999,
  
  // Formes spéciales
  button: 14,
  card: 20,
  modal: 28,
  input: 12,
  chip: 20,
  avatar: 9999,
  fab: 16,
  tooltip: 8,
} as const;

export const SIZES = {
  // Icônes
  iconXs: 14,
  iconSm: 18,
  iconMd: 22,
  iconLg: 26,
  iconXl: 32,
  iconXxl: 40,
  
  // Boutons
  buttonHeight: {
    sm: 36,
    md: 48,
    lg: 56,
    xl: 64,
  },
  
  // Avatars
  avatarSm: 32,
  avatarMd: 44,
  avatarLg: 56,
  avatarXl: 80,
  avatarXxl: 100,
  
  // Inputs
  inputHeight: 52,
  inputHeightSm: 44,
  
  // Headers
  headerHeight: 56,
  tabBarHeight: 70,
  
  // Cards
  cardMinHeight: 80,
  
  // FAB
  fabSize: 56,
  fabSizeSm: 44,
  
  // Screen
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  maxContentWidth: 600,
} as const;

export const TYPOGRAPHY = {
  // Font Families (à personnaliser selon vos fonts)
  fontFamily: {
    regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
    medium: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
    semiBold: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
    bold: Platform.OS === 'ios' ? 'System' : 'Roboto-Bold',
  },
  
  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
    hero: 48,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 12,
  },
  inner: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 0, // Pas d'élévation pour inner shadow
  },
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export const ANIMATION = {
  // Durées
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 700,
  },
  
  // Springs
  spring: {
    gentle: { damping: 20, stiffness: 150 },
    bouncy: { damping: 10, stiffness: 200 },
    stiff: { damping: 30, stiffness: 300 },
  },
  
  // Scales
  scale: {
    pressed: 0.97,
    hover: 1.02,
    active: 0.95,
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// 🎭 COMPOSANTS DE STYLE PRÉ-DÉFINIS
// ═══════════════════════════════════════════════════════════════

export interface ColorPalette {
  // Couleurs du thème
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryDark: string;
  accent: string;
  gradient: string[];
  gradientDark: string[];
  shimmer: string[];
  
  // Couleurs de base
  bg: string;
  bgAlt: string;
  card: string;
  cardAlt: string;
  modal: string;
  overlay: string;
  
  // Textes
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textOnPrimary: string;
  
  // Bordures
  border: string;
  borderLight: string;
  borderDark: string;
  divider: string;
  
  // Inputs
  input: string;
  inputBorder: string;
  inputFocusBorder: string;
  placeholder: string;
  
  // États
  success: string;
  successLight: string;
  successDark: string;
  warning: string;
  warningLight: string;
  warningDark: string;
  danger: string;
  dangerLight: string;
  dangerDark: string;
  info: string;
  infoLight: string;
  infoDark: string;
  
  // Spéciaux
  disabled: string;
  disabledText: string;
  skeleton: string;
  skeletonHighlight: string;
  ripple: string;
  
  // Ombres
  shadowColor: string;
  shadowOpacity: number;
  
  // Mode
  isDark: boolean;
}

interface ThemeContextType {
  // État du thème
  currentTheme: ThemeKey;
  setTheme: (key: ThemeKey) => void;
  activeTheme: typeof THEMES['violet'];
  
  // Mode sombre
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  
  // Palette complète
  colors: ColorPalette;
  
  // Tokens de design
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  sizes: typeof SIZES;
  typography: typeof TYPOGRAPHY;
  shadows: typeof SHADOWS;
  animation: typeof ANIMATION;
  
  // Helper de style dynamique
  getStyles: <T>(builder: (colors: ColorPalette) => T) => T;
  
  // Helpers utilitaires
  getButtonStyle: (variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger') => object;
  getCardStyle: (elevated?: boolean) => object;
  getInputStyle: (focused?: boolean, error?: boolean) => object;
  getTextStyle: (variant: 'title' | 'subtitle' | 'body' | 'caption' | 'label') => object;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════
// 🏭 PROVIDER
// ═══════════════════════════════════════════════════════════════

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('violet');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Chargement initial
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [savedTheme, savedMode] = await Promise.all([
          AsyncStorage.getItem('userTheme'),
          AsyncStorage.getItem('userDarkMode'),
        ]);

        if (savedTheme && Object.keys(THEMES).includes(savedTheme)) {
          setCurrentTheme(savedTheme as ThemeKey);
        }
        if (savedMode) {
          setIsDarkMode(savedMode === 'true');
        }
      } catch (e) {
        console.warn('Erreur chargement thème:', e);
      }
    };
    loadSettings();
  }, []);

  // Changement de thème
  const changeTheme = async (key: ThemeKey) => {
    setCurrentTheme(key);
    try {
      await AsyncStorage.setItem('userTheme', key);
    } catch (e) {
      console.warn('Erreur sauvegarde thème:', e);
    }
  };

  // Toggle mode sombre
  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await AsyncStorage.setItem('userDarkMode', String(newValue));
    } catch (e) {
      console.warn('Erreur sauvegarde mode sombre:', e);
    }
  };

  // Set mode sombre directement
  const setDarkModeValue = async (value: boolean) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem('userDarkMode', String(value));
    } catch (e) {
      console.warn('Erreur sauvegarde mode sombre:', e);
    }
  };

  // Thème actif sécurisé
  const activeTheme = THEMES[currentTheme] || THEMES.violet;

  // Génération de la palette complète
  const colors: ColorPalette = useMemo(() => {
    const theme = activeTheme;
    const dark = isDarkMode;

    return {
      // Couleurs du thème
      primary: theme.primary,
      primaryLight: theme.primaryLight,
      primaryDark: theme.primaryDark,
      secondary: dark ? '#1E293B' : theme.secondary,
      secondaryDark: dark ? '#334155' : theme.secondaryDark,
      accent: theme.accent,
      gradient: dark ? theme.gradientDark : theme.gradient,
      gradientDark: theme.gradientDark,
      shimmer: dark ? ['#1E293B', '#334155', '#1E293B'] : theme.shimmer,

      // Couleurs de base
      bg: dark ? '#0F172A' : '#F8FAFC',
      bgAlt: dark ? '#1E293B' : '#F1F5F9',
      card: dark ? '#1E293B' : '#FFFFFF',
      cardAlt: dark ? '#334155' : '#F8FAFC',
      modal: dark ? '#1E293B' : '#FFFFFF',
      overlay: dark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.5)',

      // Textes
      text: dark ? '#F1F5F9' : '#0F172A',
      textSecondary: dark ? '#94A3B8' : '#475569',
      textTertiary: dark ? '#64748B' : '#94A3B8',
      textInverse: dark ? '#0F172A' : '#F8FAFC',
      textOnPrimary: '#FFFFFF',

      // Bordures
      border: dark ? '#334155' : '#E2E8F0',
      borderLight: dark ? '#475569' : '#F1F5F9',
      borderDark: dark ? '#1E293B' : '#CBD5E1',
      divider: dark ? '#334155' : '#E2E8F0',

      // Inputs
      input: dark ? '#0F172A' : '#FFFFFF',
      inputBorder: dark ? '#475569' : '#CBD5E1',
      inputFocusBorder: theme.primary,
      placeholder: dark ? '#64748B' : '#94A3B8',

      // États
      success: '#10B981',
      successLight: dark ? '#064E3B' : '#D1FAE5',
      successDark: '#059669',
      warning: '#F59E0B',
      warningLight: dark ? '#78350F' : '#FEF3C7',
      warningDark: '#D97706',
      danger: '#EF4444',
      dangerLight: dark ? '#7F1D1D' : '#FEE2E2',
      dangerDark: '#DC2626',
      info: '#3B82F6',
      infoLight: dark ? '#1E3A8A' : '#DBEAFE',
      infoDark: '#2563EB',

      // Spéciaux
      disabled: dark ? '#334155' : '#E2E8F0',
      disabledText: dark ? '#64748B' : '#94A3B8',
      skeleton: dark ? '#334155' : '#E2E8F0',
      skeletonHighlight: dark ? '#475569' : '#F1F5F9',
      ripple: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',

      // Ombres
      shadowColor: dark ? '#000000' : '#64748B',
      shadowOpacity: dark ? 0.4 : 0.15,

      // Mode
      isDark: dark,
    };
  }, [activeTheme, isDarkMode]);

  // Helper de style dynamique
  const getStyles = <T,>(styleBuilder: (colors: ColorPalette) => T): T => {
    return styleBuilder(colors);
  };

  // Helper pour les boutons
  const getButtonStyle = (variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger') => {
    const baseStyle = {
      height: SIZES.buttonHeight.md,
      borderRadius: RADIUS.button,
      paddingHorizontal: SPACING.xl,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: colors.secondary,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: colors.danger,
        };
      default:
        return baseStyle;
    }
  };

  // Helper pour les cartes
  const getCardStyle = (elevated = true) => ({
    backgroundColor: colors.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    ...(elevated ? {
      ...SHADOWS.md,
      shadowColor: colors.shadowColor,
      shadowOpacity: colors.shadowOpacity,
    } : {
      borderWidth: 1,
      borderColor: colors.border,
    }),
  });

  // Helper pour les inputs
  const getInputStyle = (focused = false, error = false) => ({
    height: SIZES.inputHeight,
    backgroundColor: colors.input,
    borderRadius: RADIUS.input,
    borderWidth: focused ? 2 : 1,
    borderColor: error ? colors.danger : focused ? colors.primary : colors.inputBorder,
    paddingHorizontal: SPACING.lg,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: colors.text,
  });

  // Helper pour les textes
  const getTextStyle = (variant: 'title' | 'subtitle' | 'body' | 'caption' | 'label') => {
    switch (variant) {
      case 'title':
        return {
          fontSize: TYPOGRAPHY.fontSize.xl,
          fontWeight: '700' as const,
          color: colors.text,
          letterSpacing: TYPOGRAPHY.letterSpacing.tight,
        };
      case 'subtitle':
        return {
          fontSize: TYPOGRAPHY.fontSize.lg,
          fontWeight: '600' as const,
          color: colors.text,
        };
      case 'body':
        return {
          fontSize: TYPOGRAPHY.fontSize.md,
          fontWeight: '400' as const,
          color: colors.text,
          lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
        };
      case 'caption':
        return {
          fontSize: TYPOGRAPHY.fontSize.sm,
          fontWeight: '400' as const,
          color: colors.textSecondary,
        };
      case 'label':
        return {
          fontSize: TYPOGRAPHY.fontSize.sm,
          fontWeight: '600' as const,
          color: colors.textSecondary,
          textTransform: 'uppercase' as const,
          letterSpacing: TYPOGRAPHY.letterSpacing.wide,
        };
      default:
        return {
          fontSize: TYPOGRAPHY.fontSize.md,
          color: colors.text,
        };
    }
  };

  // Valeur du contexte mémorisée
  const contextValue = useMemo<ThemeContextType>(() => ({
    currentTheme,
    setTheme: changeTheme,
    activeTheme,
    isDarkMode,
    toggleDarkMode,
    setDarkMode: setDarkModeValue,
    colors,
    spacing: SPACING,
    radius: RADIUS,
    sizes: SIZES,
    typography: TYPOGRAPHY,
    shadows: SHADOWS,
    animation: ANIMATION,
    getStyles,
    getButtonStyle,
    getCardStyle,
    getInputStyle,
    getTextStyle,
  }), [currentTheme, activeTheme, isDarkMode, colors]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🪝 HOOKS
// ═══════════════════════════════════════════════════════════════

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook simplifié pour les couleurs uniquement
export const useColors = (): ColorPalette => {
  const { colors } = useTheme();
  return colors;
};

// Hook pour le mode sombre
export const useDarkMode = () => {
  const { isDarkMode, toggleDarkMode, setDarkMode } = useTheme();
  return { isDarkMode, toggleDarkMode, setDarkMode };
};

// ═══════════════════════════════════════════════════════════════
// 🛠️ UTILITAIRES
// ═══════════════════════════════════════════════════════════════

// Créer un style conditionnel basé sur le mode
export const createThemedStyles = <T extends Record<string, any>>(
  lightStyles: T,
  darkStyles: Partial<T>
) => (isDark: boolean): T => {
  return isDark ? { ...lightStyles, ...darkStyles } : lightStyles;
};

// Calculer une couleur avec opacité
export const withOpacity = (color: string, opacity: number): string => {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};

// Obtenir la couleur de contraste (clair ou sombre)
export const getContrastColor = (hexColor: string): '#FFFFFF' | '#000000' => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

export default ThemeContext;