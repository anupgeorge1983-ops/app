import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/src/theme';

interface EyebrowProps {
  label: string;
  centered?: boolean;
}

export function Eyebrow({ label, centered = false }: EyebrowProps) {
  return (
    <View style={[styles.row, centered && styles.centered]}>
      <View style={styles.dot} />
      <Text style={styles.text}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  centered: {
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.rose,
  },
  text: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: theme.colors.charcoal40,
  },
});
