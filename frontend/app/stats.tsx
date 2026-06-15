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
import { Eyebrow } from "@/src/components/ui";

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

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="stats-back-button"
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Eyebrow label="Your journey" />
        <Text style={styles.h1}>Stats</Text>
      </View>

      {loading || !stats ? (
        <ActivityIndicator color={theme.colors.rose} style={{ marginTop: 60 }} />
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
              tintColor={theme.colors.rose}
            />
          }
        >
          {/* Hero stat */}
          <View testID="hero-stat-card" style={styles.heroCard}>
            <Text style={styles.heroNumber}>
              {stats.total_resolved.toLocaleString()}
            </Text>
            <Text style={styles.heroLabel}>
              {stats.total_resolved === 1 ? "couple has" : "couples have"} found
              their way back
            </Text>
          </View>

          {/* Personal stats */}
          <Text style={styles.sectionLabel}>You and your partner</Text>
          <View style={styles.grid}>
            <StatTile
              testID="stat-my-resolved"
              icon={<Feather name="check-circle" size={20} color={theme.colors.success} />}
              value={stats.my_resolved}
              label="Resolved"
            />
            <StatTile
              testID="stat-my-in-progress"
              icon={<Feather name="clock" size={20} color={theme.colors.amber} />}
              value={stats.my_in_progress}
              label="In progress"
            />
            <StatTile
              testID="stat-my-total"
              icon={<Feather name="archive" size={20} color={theme.colors.charcoal55} />}
              value={stats.my_cases}
              label="Cases started"
            />
            <StatTile
              testID="stat-my-rate"
              icon={<Feather name="trending-up" size={20} color={theme.colors.rose} />}
              value={
                stats.my_cases > 0
                  ? `${Math.round((stats.my_resolved / stats.my_cases) * 100)}%`
                  : "—"
              }
              label="Resolution rate"
            />
          </View>

          {/* Community stats */}
          <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Community</Text>
          <View style={styles.grid}>
            <StatTile
              testID="stat-total-resolved"
              icon={<Feather name="heart" size={20} color={theme.colors.rose} />}
              value={stats.total_resolved}
              label="Total resolved"
            />
            <StatTile
              testID="stat-total-cases"
              icon={<Feather name="users" size={20} color={theme.colors.charcoal55} />}
              value={stats.total_cases}
              label="Total cases"
            />
          </View>

          {/* Encouragement */}
          {stats.my_resolved > 0 && (
            <View style={styles.encouragement}>
              <Feather name="award" size={18} color={theme.colors.amber} />
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
  safe: { flex: 1, backgroundColor: theme.colors.cream },

  header: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  backBtn: { alignSelf: "flex-start", paddingVertical: 6, marginBottom: 20 },
  backBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },
  h1: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 26,
    lineHeight: 34,
    color: theme.colors.charcoal,
    marginBottom: 4,
  },

  scroll: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },

  // Hero card — amber-soft bg, large Lora number
  heroCard: {
    backgroundColor: theme.colors.amberSoft,
    borderRadius: theme.radius.card,
    padding: 28,
    alignItems: "center",
    marginBottom: 28,
  },
  heroNumber: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 64,
    lineHeight: 72,
    color: theme.colors.charcoal,
    letterSpacing: -2,
  },
  heroLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal55,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 22,
  },

  // Section label
  sectionLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: theme.colors.charcoal40,
    marginBottom: 12,
  },

  // Stat grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.charcoal18,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  tileIcon: { marginBottom: 10 },
  tileValue: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 28,
    color: theme.colors.charcoal,
    letterSpacing: -0.5,
  },
  tileLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    marginTop: 3,
  },

  // Encouragement
  encouragement: {
    marginTop: 28,
    padding: 18,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.roseSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  encouragementText: {
    flex: 1,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal,
    lineHeight: 22,
  },
});
