import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { theme } from "@/src/theme";
import { api } from "@/src/api";
import { getOrCreateUserId, isOnboarded } from "@/src/session";
import { Eyebrow, BtnDark, BtnGhost, BtnText } from "@/src/components/ui";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalResolved, setTotalResolved] = useState<number | null>(null);

  // ── Orb animation ────────────────────────────────────────────────────────
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [progress]);

  const translateA = progress.interpolate({ inputRange: [0, 1], outputRange: [-46, 14] });
  const scaleA    = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.04] });
  const opacityA  = progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.9] });
  const translateB = progress.interpolate({ inputRange: [0, 1], outputRange: [46, -14] });
  const scaleB    = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.04] });
  const opacityB  = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.85] });

  // ── Data loading (unchanged) ──────────────────────────────────────────────
  const load = useCallback(async () => {
    const done = await isOnboarded();
    if (!done) {
      router.replace("/onboarding");
      return;
    }
    const uid = await getOrCreateUserId();
    try {
      const s = await api.getStats(uid);
      setTotalResolved(s.total_resolved);
    } catch {
      // silent fail — stats line just won't show
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.rose} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const motivational =
    totalResolved === null
      ? null
      : totalResolved === 0
        ? "Be the first couple to find their way back."
        : totalResolved === 1
          ? "1 couple has found their way back."
          : `${totalResolved.toLocaleString()} couples have found their way back.`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Ambient corner blobs */}
      <View style={styles.blobTR} pointerEvents="none" />
      <View style={styles.blobBL} pointerEvents="none" />

      {/* Profile icon — top right */}
      <View style={styles.topBar}>
        <TouchableOpacity
          testID="profile-icon-button"
          onPress={() => router.push("/profile")}
          style={styles.profileBtn}
          activeOpacity={0.7}
        >
          <Feather name="user" size={20} color={theme.colors.charcoal} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Hero block */}
        <View style={styles.heroBlock}>
          <Eyebrow label="Be Heard" />

          <Text style={styles.h1} testID="brand-title">
            {"A quiet space\nto find your\n"}
            <Text style={styles.h1Em}>way back.</Text>
          </Text>

          <Text style={styles.subtext} testID="tagline">
            When the argument is over but the distance remains — this is where you begin.
          </Text>

          {motivational && (
            <Text testID="motivational-stats" style={styles.motivational}>
              {motivational}
            </Text>
          )}
        </View>

        {/* Drifting orbs */}
        <View style={styles.orbStage}>
          <Animated.View
            style={[
              styles.orbA,
              { transform: [{ translateX: translateA }, { scale: scaleA }], opacity: opacityA },
            ]}
          />
          <Animated.View
            style={[
              styles.orbB,
              { transform: [{ translateX: translateB }, { scale: scaleB }], opacity: opacityB },
            ]}
          />
        </View>

        {/* Button stack */}
        <View style={styles.btnStack}>
          <BtnDark
            testID="start-case-button"
            label="Start a conversation"
            onPress={() => router.push("/case/new")}
          />
          <BtnGhost
            label="Join a conversation"
            onPress={() => router.push("/join")}
          />
          <BtnText
            label="View past conversations"
            onPress={() => router.push("/cases")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },

  // Ambient background blobs
  blobTR: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -80,
    right: -80,
    backgroundColor: "rgba(245,232,228,0.55)",
  },
  blobBL: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    bottom: -60,
    left: -60,
    backgroundColor: "rgba(243,236,220,0.5)",
  },

  // Profile icon
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  profileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: theme.colors.charcoal18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.offWhite,
    ...theme.shadow.card,
  },

  // Main content column
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingBottom: 36,
  },

  // Hero text
  heroBlock: {
    marginTop: 20,
    marginBottom: 4,
  },
  h1: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 34,
    lineHeight: 42,
    color: theme.colors.charcoal,
    marginBottom: 16,
  },
  h1Em: {
    fontFamily: theme.fonts.serifMediumItalic,
    color: theme.colors.rose,
  },
  subtext: {
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    lineHeight: 28,
    color: theme.colors.charcoal55,
    maxWidth: 300,
  },
  motivational: {
    marginTop: 12,
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    letterSpacing: 0.2,
  },

  // Orb stage
  orbStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  orbA: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.colors.rose,
  },
  orbB: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: theme.colors.amber,
  },

  // Buttons
  btnStack: {
    gap: 10,
  },
});
