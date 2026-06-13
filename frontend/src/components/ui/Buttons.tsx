import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '@/src/theme';

interface BtnProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

export function BtnDark({ label, onPress, disabled, testID }: BtnProps) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.base, styles.dark, disabled && styles.disabled]}
    >
      <Text style={[styles.baseText, styles.darkText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function BtnGhost({ label, onPress, disabled, testID }: BtnProps) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.base, styles.ghost, disabled && styles.disabled]}
    >
      <Text style={[styles.baseText, styles.ghostText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function BtnRose({ label, onPress, disabled, testID }: BtnProps) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.base, styles.rose, disabled && styles.disabled]}
    >
      <Text style={[styles.baseText, styles.roseText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function BtnText({ label, onPress, testID }: BtnProps) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.7} style={styles.textBtn}>
      <Text style={styles.textBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

interface BtnStackProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BtnStack({ children, style }: BtnStackProps) {
  return <View style={[styles.stack, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.45 },
  baseText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  dark: {
    backgroundColor: theme.colors.charcoal,
  },
  darkText: {
    color: '#F7F3EE',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.charcoal18,
  },
  ghostText: {
    color: theme.colors.charcoal,
  },
  rose: {
    backgroundColor: theme.colors.rose,
  },
  roseText: {
    color: '#FFFFFF',
  },
  textBtn: {
    width: '100%',
    paddingVertical: 8,
    alignItems: 'center',
  },
  textBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
    letterSpacing: 0.3,
  },
  stack: {
    gap: 10,
  },
});
