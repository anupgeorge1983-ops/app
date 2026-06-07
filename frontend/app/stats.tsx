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
import { getOrCreateUserId } from "@/src/session";

type Stats = {
  total_cases: number;
  total_resolved: number;
  my_cases: number;
  my_resolved: number;
  my_in_progress: number;
};

export default function StatsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          testID="stats-back-button"
          onPress={() => router.back()}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.title}>Your stats</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading || !stats ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Hero stat */}
          <View testID="hero-stat-card" style={styles.heroCard}>
            <Text style={styles.heroNumber}>{stats.total_resolved.toLocaleString()}</Text>
            <Text style={styles.heroLabel}>
              {stats.total_resolved === 1 ? "couple has" : "couples have"} found their way back
            </Text>
          </View>

          <Text style={styles.section}>YOU AND YOUR PARTNER</Text>
          <View style={styles.grid}>
            <StatTile
              testID="stat-my-resolved"
              icon={<Feather name="check-circle" size={20} color={theme.colors.success} />}
              value={stats.my_resolved}
              label="Resolved"
            />
            <StatTile
              testID="stat-my-in-progress"
              icon={<Feather name="clock" size={20} color={theme.colors.primary} />}
              value={stats.my_in_progress}
              label="In progress"
            />
            <StatTile
              testID="stat-my-total"
              icon={<Feather name="archive" size={20} color={theme.colors.textBody} />}
              value={stats.my_cases}
              label="Cases started"
            />
            <StatTile
              testID="stat-my-rate"
              icon={<Feather name="trending-up" size={20} color={theme.colors.warning} />}
              value={
                stats.my_cases > 0
                  ? `${Math.round((stats.my_resolved / stats.my_cases) * 100)}%`
                  : "—"
              }
              label="Resolution rate"
            />
          </View>

          <Text style={[styles.section, { marginTop: theme.spacing.xl }]}>COMMUNITY</Text>
          <View style={styles.grid}>
            <StatTile
              testID="stat-total-resolved"
              icon={<Feather name="heart" size={20} color={theme.colors.primary} />}
              value={stats.total_resolved}
              label="Total resolved"
            />
            <StatTile
              testID="stat-total-cases"
              icon={<Feather name="users" size={20} color={theme.colors.textBody} />}
              value={stats.total_cases}
              label="Total cases"
            />
          </View>

          {stats.my_resolved > 0 && (
            <View style={styles.encouragement}>
              <Feather name="award" size={18} color={theme.colors.primary} />
              <Text style={styles.encouragementText}>
                {stats.my_resolved === 1
                  ? "You've found your way back once. That counts."
                  : `You've found your way back ${stats.my_resolved} times. Keep showing up.`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatTile({
  icon,
  value,
  label,
  testID,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.tile}>
      <View style={styles.tileIcon}>{icon}</View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
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
  title: { fontSize: 17, fontWeight: "600", color: theme.colors.textHeading },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  heroCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.card,
    padding: theme.spacing.xl,
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  heroNumber: { fontSize: 64, fontWeight: "800", color: "#fff", letterSpacing: -2 },
  heroLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  section: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: theme.colors.textSubtle,
    marginBottom: theme.spacing.md,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  tile: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  tileIcon: { marginBottom: theme.spacing.sm },
  tileValue: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textHeading,
    letterSpacing: -0.5,
  },
  tileLabel: { fontSize: 12, color: theme.colors.textSubtle, marginTop: 2 },
  encouragement: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primaryTint,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  encouragementText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textHeading,
    lineHeight: 21,
  },
});
