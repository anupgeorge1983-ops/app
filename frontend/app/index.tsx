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
import { getOrCreateUserId, isOnboarded } from "@/src/session";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const done = await isOnboarded();
    if (!done) {
      router.replace("/onboarding");
      return;
    }
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

  const lastCase = cases[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.brand} testID="brand-title">Be Heard</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        <View style={{ marginTop: theme.spacing.xl }}>
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

        <Text style={styles.sectionLabel}>LAST CASE</Text>

        {lastCase ? (
          <TouchableOpacity
            testID={`case-card-${lastCase.id}`}
            onPress={() => {
              if (lastCase.stage === "verdict_ready") router.push(`/verdict/${lastCase.id}`);
              else router.push(`/case/${lastCase.id}`);
            }}
            style={styles.caseCard}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.caseTitle} numberOfLines={1}>
                {lastCase.title}
              </Text>
              <View style={styles.caseStatusRow}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        lastCase.status === "resolved"
                          ? theme.colors.success
                          : theme.colors.primary,
                    },
                  ]}
                />
                <Text style={styles.caseStatus}>
                  {lastCase.status === "resolved" ? "Resolved" : "In progress"}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textSubtle} />
          </TouchableOpacity>
        ) : (
          <View testID="no-cases-empty" style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              You have no cases yet. Start one above when you&apos;re ready.
            </Text>
          </View>
        )}

        {cases.length > 1 && (
          <View style={{ marginTop: theme.spacing.xl }}>
            <Text style={styles.sectionLabel}>EARLIER</Text>
            {cases.slice(1).map((c) => (
              <TouchableOpacity
                key={c.id}
                testID={`case-card-${c.id}`}
                onPress={() => {
                  if (c.stage === "verdict_ready") router.push(`/verdict/${c.id}`);
                  else router.push(`/case/${c.id}`);
                }}
                style={styles.caseCardSmall}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.caseTitle} numberOfLines={1}>{c.title}</Text>
                  <View style={styles.caseStatusRow}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            c.status === "resolved"
                              ? theme.colors.success
                              : theme.colors.primary,
                        },
                      ]}
                    />
                    <Text style={styles.caseStatus}>
                      {c.status === "resolved" ? "Resolved" : "In progress"}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textSubtle} />
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  brand: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textHeading,
    letterSpacing: -0.4,
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
  scroll: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  hero: {
    fontSize: 30,
    fontWeight: "700",
    color: theme.colors.textHeading,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  heroSub: {
    fontSize: 16,
    color: theme.colors.textBody,
    marginTop: theme.spacing.sm,
    lineHeight: 22,
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
  startBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  sectionLabel: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.colors.textSubtle,
    fontWeight: "700",
  },
  caseCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  caseCardSmall: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  caseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textHeading,
  },
  caseStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  caseStatus: { fontSize: 13, color: theme.colors.textBody },
  emptyCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  emptyText: { fontSize: 14, color: theme.colors.textSubtle, lineHeight: 20 },
});
