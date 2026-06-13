import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '@/src/theme';

interface BackButtonProps {
  onPress: () => void;
  label?: string;
  testID?: string;
}

export function BackButton({ onPress, label = '← Back', testID }: BackButtonProps) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} style={styles.btn} activeOpacity={0.7}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'flex-start',
    marginBottom: 32,
    paddingVertical: 4,
  },
  text: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },
});
