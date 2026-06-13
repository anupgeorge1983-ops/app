import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '@/src/theme';

interface VoiceRowProps {
  label?: string;
  onPress?: () => void;
  recording?: boolean;
}

export function VoiceRow({
  label = "Hold to speak — it's easier than typing when you're upset.",
  onPress,
  recording = false,
}: VoiceRowProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.mic, recording && styles.micActive]}
      >
        <Feather name="mic" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.button,
    padding: 16,
    marginTop: 18,
    ...theme.shadow.card,
  },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  micActive: {
    backgroundColor: theme.colors.amber,
  },
  label: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal55,
    lineHeight: 20,
    flex: 1,
  },
});
