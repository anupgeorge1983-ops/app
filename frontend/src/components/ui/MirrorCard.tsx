import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/src/theme';

interface MirrorCardProps {
  text: string;
}

export function MirrorCard({ text }: MirrorCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.glowTR} />
      <View style={styles.glowBL} />
      <View style={styles.markOpen} />
      <Text style={styles.body}>{text}</Text>
      <View style={styles.markClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.letter,
    padding: 32,
    marginVertical: 18,
    marginHorizontal: 2,
    overflow: 'hidden',
    ...theme.shadow.letter,
  },
  glowTR: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(201,135,122,0.18)',
  },
  glowBL: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212,168,83,0.14)',
  },
  markOpen: {
    width: 28,
    height: 2,
    borderRadius: 2,
    backgroundColor: theme.colors.rose,
    marginBottom: 18,
  },
  markClose: {
    width: 28,
    height: 2,
    borderRadius: 2,
    backgroundColor: theme.colors.amber,
    marginTop: 18,
    alignSelf: 'flex-end',
  },
  body: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 17,
    lineHeight: 28,
    color: theme.colors.charcoal,
  },
});
