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
import { api, Case } from "@/src/api";
import { getOrCreateUserId } from "@/src/session";
import { Eyebrow } from "@/src/components/ui";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function CasesScreen() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const uid = await getOrCreateUserId();
    try {
      const list = await api.listCases(uid);
      setCases(list);
    } catch (e) {
      console.warn("listCases failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resolved = cases.filter((c) => c.status === "resolved");
  const inProgress = cases.filter((c) => c.status !== "resolved");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="cases-back-button"
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Eyebrow label="Past conversations" />
        <Text style={styles.h1}>Your history</Text>
      </View>

      {loading ? (
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
          {cases.length === 0 ? (
            <View testID="cases-empty" style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="archive" size={24} color={theme.colors.charcoal40} />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>
                Start a conversation from the home screen when you&apos;re ready.
              </Text>
            </View>
          ) : (
            <>
              {inProgress.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>In Progress</Text>
                  {inProgress.map((c) => (
                    <CaseRow key={c.id} c={c} onPress={() => router.push(`/case/${c.id}`)} />
                  ))}
                </View>
              )}
              {resolved.length > 0 && (
                <View style={[styles.section, inProgress.length > 0 && { marginTop: 28 }]}>
                  <Text style={styles.sectionLabel}>Resolved</Text>
                  {resolved.map((c) => (
                    <CaseRow key={c.id} c={c} onPress={() => router.push(`/verdict/${c.id}`)} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function CaseRow({ c, onPress }: { c: Case; onPress: () => void }) {
  const isResolved = c.status === "resolved";
  return (
    <TouchableOpacity
      testID={`case-row-${c.id}`}
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.row}
    >
      <View style={styles.rowContent}>
        <Text style={styles.rowDate}>{formatDate(c.created_at)}</Text>
        <Text style={styles.rowTitle} numberOfLines={1}>{c.title}</Text>
        <Text style={styles.rowStatus}>
          {isResolved ? "Resolved" : "In progress"}
        </Text>
      </View>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: isResolved ? theme.colors.success : theme.colors.amber },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.cream },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },

  section: {},
  sectionLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: theme.colors.charcoal40,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    ...theme.shadow.card,
  },
  rowContent: { flex: 1, paddingRight: 12 },
  rowDate: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    marginBottom: 4,
  },
  rowTitle: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 16,
    color: theme.colors.charcoal,
    marginBottom: 4,
  },
  rowStatus: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.charcoal40,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },

  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.creamWarm,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 18,
    color: theme.colors.charcoal,
  },
  emptySub: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 22,
  },
});
