import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
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
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<{
    total_resolved: number;
    my_resolved: number;
    my_in_progress: number;
  } | null>(null);

  const load = useCallback(async () => {
    const done = await isOnboarded();
    if (!done) {
      router.replace("/onboarding");
      return;
    }
    const uid = await getOrCreateUserId();
    try {
      const s = await api.getStats(uid);
      setStats(s);
    } catch (e) {
      console.warn("stats failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const startNewCase = () => router.push("/case/new");

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const totalResolved = stats?.total_resolved ?? 0;
  const motivational =
    totalResolved === 0
      ? "Be the first couple to find their way back."
      : totalResolved === 1
        ? "1 couple has found their way back."
        : `${totalResolved.toLocaleString()} couples have found their way back.`;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top bar */}
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

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Text style={styles.brand} testID="brand-title">Be Heard</Text>

        <View style={{ marginTop: theme.spacing.lg }}>
          <Text style={styles.hero}>A calm bridge{"\n"}back to each other.</Text>
          <Text style={styles.heroSub}>
            When the silence after an argument feels heavy — start here.
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

        <Text testID="motivational-stats" style={styles.motivational}>
          {motivational}
        </Text>

        <View style={styles.divider} />

        <TouchableOpacity
          testID="past-cases-button"
          onPress={() => router.push("/cases")}
          activeOpacity={0.85}
          style={styles.linkRow}
        >
          <View style={styles.linkIcon}>
            <Feather name="archive" size={18} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Past cases</Text>
            <Text style={styles.linkSub}>
              {stats?.my_resolved || 0} resolved · {stats?.my_in_progress || 0} in progress
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.colors.textSubtle} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="stats-button"
          onPress={() => router.push("/stats")}
          activeOpacity={0.85}
          style={styles.linkRow}
        >
          <View style={styles.linkIcon}>
            <Feather name="bar-chart-2" size={18} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>Your stats</Text>
            <Text style={styles.linkSub}>Personal and community totals</Text>
          </View>
          <Feather name="chevron-right" size={20} color={theme.colors.textSubtle} />
        </TouchableOpacity>
      </ScrollView>
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
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  brand: {
    fontSize: 56,
    fontWeight: "800",
    color: theme.colors.textHeading,
    letterSpacing: -1.5,
    lineHeight: 60,
    marginTop: theme.spacing.md,
  },
  hero: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.textBody,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  heroSub: {
    fontSize: 15,
    color: theme.colors.textSubtle,
    marginTop: theme.spacing.sm,
    lineHeight: 21,
  },
  startBtn: {
    marginTop: theme.spacing.xl,
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
    color: theme.colors.primary,
    textAlign: "center",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSoft,
    marginVertical: theme.spacing.xl,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.textHeading },
  linkSub: { fontSize: 13, color: theme.colors.textSubtle, marginTop: 2 },
});
