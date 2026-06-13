import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/src/theme';

interface LetterCardProps {
  fromLabel?: string;
  fromName: string;
  body: string;
  attribution?: string;
}

export function LetterCard({
  fromLabel = 'A message from',
  fromName,
  body,
  attribution,
}: LetterCardProps) {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.fromLabel}>{fromLabel.toUpperCase()}</Text>
        <Text style={styles.fromName}>{fromName}</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.glowBL} />
        <View style={styles.accent} />
        <Text style={styles.body}>{body}</Text>
        {attribution && (
          <View style={styles.attributionRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{fromName[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.attributionText}>{attribution}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  fromLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 1.8,
    color: theme.colors.charcoal40,
    marginBottom: 6,
  },
  fromName: {
    fontFamily: theme.fonts.serifMediumItalic,
    fontSize: 28,
    color: theme.colors.rose,
  },
  card: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.letter,
    padding: 32,
    overflow: 'hidden',
    ...theme.shadow.letter,
  },
  glowBL: {
    position: 'absolute',
    bottom: -36,
    left: -36,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212,168,83,0.16)',
  },
  accent: {
    width: 28,
    height: 2,
    borderRadius: 2,
    backgroundColor: theme.colors.amber,
    marginBottom: 22,
  },
  body: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 17,
    lineHeight: 30,
    color: theme.colors.charcoal,
  },
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.roseSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 13,
    color: theme.colors.rose,
  },
  attributionText: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.charcoal40,
  },
});
