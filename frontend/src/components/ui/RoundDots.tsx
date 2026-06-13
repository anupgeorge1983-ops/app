import { View, StyleSheet } from 'react-native';
import { theme } from '@/src/theme';

interface RoundDotsProps {
  total?: number;
  active: number;
}

export function RoundDots({ total = 3, active }: RoundDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i < active && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.charcoal18,
  },
  dotActive: {
    backgroundColor: theme.colors.charcoal,
  },
});
