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

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const resolved = cases.filter((c) => c.status === "resolved");
  const inProgress = cases.filter((c) => c.status !== "resolved");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          testID="cases-back-button"
          onPress={() => router.back()}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.title}>Past cases</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
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
          {cases.length === 0 ? (
            <View testID="cases-empty" style={styles.empty}>
              <Feather name="archive" size={28} color={theme.colors.textSubtle} />
              <Text style={styles.emptyTitle}>No cases yet</Text>
              <Text style={styles.emptySub}>
                Start a case from the home screen when you&apos;re ready.
              </Text>
            </View>
          ) : (
            <>
              {inProgress.length > 0 && (
                <>
                  <Text style={styles.section}>IN PROGRESS</Text>
                  {inProgress.map((c) => (
                    <CaseRow key={c.id} c={c} onPress={() => router.push(`/case/${c.id}`)} />
                  ))}
                </>
              )}
              {resolved.length > 0 && (
                <>
                  <Text style={[styles.section, { marginTop: theme.spacing.xl }]}>RESOLVED</Text>
                  {resolved.map((c) => (
                    <CaseRow
                      key={c.id}
                      c={c}
                      onPress={() => router.push(`/verdict/${c.id}`)}
                    />
                  ))}
                </>
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
      activeOpacity={0.85}
      style={styles.row}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{c.title}</Text>
        <View style={styles.rowMeta}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: isResolved ? theme.colors.success : theme.colors.primary,
              },
            ]}
          />
          <Text style={styles.rowStatus}>
            {isResolved ? "Resolved" : "In progress"}
          </Text>
          <Text style={styles.rowDate}> · {formatDate(c.created_at)}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={theme.colors.textSubtle} />
    </TouchableOpacity>
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
  section: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: theme.colors.textSubtle,
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.textHeading },
  rowMeta: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  rowStatus: { fontSize: 13, color: theme.colors.textBody },
  rowDate: { fontSize: 13, color: theme.colors.textSubtle },
  empty: { alignItems: "center", paddingVertical: theme.spacing.xxl, gap: theme.spacing.sm },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textHeading,
    marginTop: theme.spacing.md,
  },
  emptySub: {
    fontSize: 14,
    color: theme.colors.textSubtle,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
});
