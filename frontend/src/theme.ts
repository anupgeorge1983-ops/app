// Be Heard design tokens — warm editorial palette
export const theme = {
  colors: {
    // Core palette
    cream: '#F9F7F4',
    creamWarm: '#F5EEE8',
    creamDeep: '#F1E8DC',
    charcoal: '#2C2C2A',
    charcoal55: 'rgba(44,44,42,0.55)',
    charcoal40: 'rgba(44,44,42,0.40)',
    charcoal18: 'rgba(44,44,42,0.18)',
    charcoal06: 'rgba(44,44,42,0.06)',
    charcoal04: 'rgba(44,44,42,0.04)',
    rose: '#C9877A',
    roseSoft: 'rgba(201,135,122,0.12)',
    amber: '#D4A853',
    amberSoft: 'rgba(212,168,83,0.12)',
    offWhite: '#FFFDFB',

    // Aliases for existing screen compatibility
    background: '#F9F7F4',
    surface: '#FFFFFF',
    primary: '#C9877A',
    primaryTint: 'rgba(201,135,122,0.12)',
    primaryTintStrong: 'rgba(201,135,122,0.20)',
    primaryBorder: 'rgba(201,135,122,0.30)',
    textHeading: '#2C2C2A',
    textBody: 'rgba(44,44,42,0.55)',
    textSubtle: 'rgba(44,44,42,0.40)',
    border: 'rgba(44,44,42,0.18)',
    borderSoft: 'rgba(44,44,42,0.06)',
    inputBg: '#FFFDFB',
    success: '#4A9F6B',
    successTint: 'rgba(74,159,107,0.12)',
    successText: '#2D7A4F',
    warning: '#D4A853',
    warningTint: 'rgba(212,168,83,0.12)',
    warningText: '#8A6520',
    danger: '#C9877A',
  },

  fonts: {
    serif: 'Lora_400Regular',
    serifMedium: 'Lora_500Medium',
    serifItalic: 'Lora_400Regular_Italic',
    serifMediumItalic: 'Lora_500Medium_Italic',
    sans: 'DMSans_400Regular',
    sansLight: 'DMSans_300Light',
    sansMedium: 'DMSans_500Medium',
  },

  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },

  radius: { card: 20, button: 16, input: 12, pill: 999, letter: 24 },

  font: {
    h1: 34,
    h2: 26,
    h3: 20,
    body: 16,
    sub: 14,
    small: 13,
    micro: 12,
    tiny: 11,
  },

  shadow: {
    card: {
      shadowColor: '#2C2C2A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    letter: {
      shadowColor: '#2C2C2A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.10,
      shadowRadius: 20,
      elevation: 8,
    },
  },
} as const;
