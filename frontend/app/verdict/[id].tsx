import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { theme } from "@/src/theme";
import { api, Case, Verdict } from "@/src/api";

export default function VerdictScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [whose, setWhose] = useState<"a" | "b">("a");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const c = await api.getCase(id);
      setCaseData(c);
    } catch (e: any) {
      setError(e?.message || "Could not load verdict.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!caseData) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
        {error && <Text style={styles.error}>{error}</Text>}
      </SafeAreaView>
    );
  }

  if (!caseData.a_verdict || !caseData.b_verdict) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            testID="verdict-back-button"
            onPress={() => router.replace("/")}
            style={{ width: 40, height: 40, justifyContent: "center" }}
          >
            <Feather name="arrow-left" size={22} color={theme.colors.textHeading} />
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: "center", marginTop: 80 }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.sub}>Preparing the verdict…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const verdict: Verdict = whose === "a" ? caseData.a_verdict : caseData.b_verdict;
  const speakerName =
    whose === "a" ? caseData.partner_a_name : caseData.partner_b_name;
  const otherName =
    whose === "a" ? caseData.partner_b_name : caseData.partner_a_name;
  const isProportionate = verdict.pill === "Proportionate";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          testID="verdict-back-button"
          onPress={() => router.replace("/")}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Verdict</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Tabs to switch verdict */}
        <View style={styles.tabs}>
          <TouchableOpacity
            testID="verdict-tab-a"
            onPress={() => setWhose("a")}
            activeOpacity={0.85}
            style={[styles.tab, whose === "a" && styles.tabActive]}
          >
            <Text style={[styles.tabText, whose === "a" && styles.tabTextActive]}>
              {caseData.partner_a_name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="verdict-tab-b"
            onPress={() => setWhose("b")}
            activeOpacity={0.85}
            style={[styles.tab, whose === "b" && styles.tabActive]}
          >
            <Text style={[styles.tabText, whose === "b" && styles.tabTextActive]}>
              {caseData.partner_b_name}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pillRow}>
          <Text style={styles.caseTitle}>{caseData.title}</Text>
          <View
            testID={`pill-${verdict.pill.toLowerCase()}`}
            style={[
              styles.pill,
              isProportionate ? styles.pillSuccess : styles.pillWarn,
            ]}
          >
            <View
              style={[
                styles.pillDot,
                {
                  backgroundColor: isProportionate
                    ? theme.colors.success
                    : theme.colors.warning,
                },
              ]}
            />
            <Text
              style={[
                styles.pillText,
                {
                  color: isProportionate
                    ? theme.colors.successText
                    : theme.colors.warningText,
                },
              ]}
            >
              {verdict.pill}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>WHAT HAPPENED</Text>
        <Text style={styles.summary} testID="verdict-summary">
          {verdict.summary}
        </Text>

        <View style={[styles.card, styles.cardSuccess]} testID="verdict-did-well">
          <Text style={[styles.cardHead, { color: theme.colors.successText }]}>
            What {speakerName} did well
          </Text>
          <Text style={styles.cardBody}>{verdict.did_well}</Text>
        </View>

        <View style={[styles.card, styles.cardWarn]} testID="verdict-could-differently">
          <Text style={[styles.cardHead, { color: theme.colors.warningText }]}>
            Could have done differently
          </Text>
          <Text style={styles.cardBody}>{verdict.could_differently}</Text>
        </View>

        <View style={styles.actionCard} testID="verdict-one-action">
          <Text style={styles.actionLabel}>ONE ACTION</Text>
          <Text style={styles.actionText}>{verdict.action}</Text>
        </View>

        <TouchableOpacity
          testID="see-partner-verdict-button"
          onPress={() => setWhose(whose === "a" ? "b" : "a")}
          activeOpacity={0.85}
          style={styles.swapBtn}
        >
          <Feather name="repeat" size={16} color={theme.colors.primary} />
          <Text style={styles.swapText}>See {otherName}&apos;s verdict</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="verdict-done-button"
          onPress={() => router.replace("/")}
          activeOpacity={0.85}
          style={styles.doneBtn}
        >
          <Text style={styles.doneText}>Done</Text>
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
  topTitle: { fontSize: 17, fontWeight: "600", color: theme.colors.textHeading },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  tabs: {
    flexDirection: "row",
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.pill,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.radius.pill,
  },
  tabActive: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabText: { fontSize: 14, color: theme.colors.textBody, fontWeight: "500" },
  tabTextActive: { color: theme.colors.textHeading, fontWeight: "700" },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  caseTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textHeading,
    flex: 1,
    marginRight: theme.spacing.md,
    letterSpacing: -0.4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillSuccess: { backgroundColor: theme.colors.successTint },
  pillWarn: { backgroundColor: theme.colors.warningTint },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 13, fontWeight: "600" },
  sectionTitle: {
    fontSize: 11,
    color: theme.colors.textSubtle,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  summary: {
    fontSize: 17,
    color: theme.colors.textHeading,
    lineHeight: 26,
    marginBottom: theme.spacing.lg,
  },
  card: {
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
  },
  cardSuccess: {
    backgroundColor: theme.colors.successTint,
    borderColor: "rgba(16,185,129,0.25)",
  },
  cardWarn: {
    backgroundColor: theme.colors.warningTint,
    borderColor: "rgba(245,158,11,0.25)",
  },
  cardHead: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  cardBody: {
    fontSize: 15,
    color: theme.colors.textBody,
    lineHeight: 22,
  },
  actionCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  actionLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  actionText: { color: "#fff", fontSize: 17, lineHeight: 25, fontWeight: "500" },
  swapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  swapText: { color: theme.colors.primary, fontSize: 14, fontWeight: "600" },
  doneBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.button,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  doneText: { color: theme.colors.textHeading, fontSize: 15, fontWeight: "600" },
  sub: {
    fontSize: 14,
    color: theme.colors.textSubtle,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  error: { color: theme.colors.danger, textAlign: "center", marginTop: 20 },
});
