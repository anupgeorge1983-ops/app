import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { theme } from "@/src/theme";
import { api } from "@/src/api";
import { getOrCreateUserId, isOnboarded } from "@/src/session";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalResolved, setTotalResolved] = useState<number | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const startNewCase = () => router.push("/case/new");

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
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

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top bar — profile icon only */}
      <View style={styles.topBar}>
        <View style={{ width: 40 }} />
        <TouchableOpacity
          testID="profile-icon-button"
          onPress={() => router.push("/profile")}
          style={styles.profileBtn}
          activeOpacity={0.7}
        >
          <Feather name="user" size={22} color={theme.colors.textHeading} />
        </TouchableOpacity>
      </View>

      {/* Centered minimal content */}
      <View style={styles.content}>
        <View style={styles.heroBlock}>
          <Text
            style={styles.brand}
            testID="brand-title"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            Be Heard
          </Text>
          <Text style={styles.tagline} testID="tagline">
            A calm bridge back to each other
          </Text>
        </View>

        <TouchableOpacity
          testID="start-case-button"
          onPress={startNewCase}
          style={styles.startBtn}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>Start a case</Text>
          <Feather name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>

        {motivational && (
          <Text testID="motivational-stats" style={styles.motivational}>
            {motivational}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: "center",
    paddingBottom: theme.spacing.xxl,
  },
  heroBlock: {
    alignItems: "flex-start",
    marginBottom: theme.spacing.xxl,
  },
  brand: {
    fontSize: 52,
    fontWeight: "800",
    color: theme.colors.textHeading,
    letterSpacing: -1.6,
    lineHeight: 56,
  },
  tagline: {
    marginTop: theme.spacing.md,
    fontSize: 17,
    color: theme.colors.textSubtle,
    lineHeight: 24,
  },
  startBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  startBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  motivational: {
    marginTop: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textSubtle,
    textAlign: "center",
    fontWeight: "400",
  },
});
