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
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "@/src/theme";
import { api, Case } from "@/src/api";
import { Eyebrow } from "@/src/components/ui";

const GRADIENT = ["#F9F7F4", "#F5EEE8", "#F1E8DC"] as const;

export default function VerdictScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
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

  useEffect(() => { load(); }, [load]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!caseData) {
    return (
      <GradientScreen>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <ActivityIndicator color={theme.colors.rose} style={{ marginTop: 80 }} />
          {error && <Text style={styles.errorText}>{error}</Text>}
        </SafeAreaView>
      </GradientScreen>
    );
  }

  // ── Verdict not yet ready ─────────────────────────────────────────────────
  if (!caseData.a_verdict) {
    return (
      <GradientScreen>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.topBar}>
            <TouchableOpacity
              testID="verdict-back-button"
              onPress={() => router.replace("/")}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pendingWrap}>
            <ActivityIndicator color={theme.colors.rose} />
            <Text style={styles.pendingText}>Preparing the verdict…</Text>
          </View>
        </SafeAreaView>
      </GradientScreen>
    );
  }

  // ── Verdict ready — show the user's own side (partner A by default) ───────
  const verdict = caseData.a_verdict;
  const speakerName = caseData.partner_a_name;
  const isProportionate = verdict.pill === "Proportionate";

  return (
    <GradientScreen>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Back button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            testID="verdict-back-button"
            onPress={() => router.replace("/")}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Eyebrow label="Your verdict" />
          <Text style={styles.caseTitle}>{caseData.title}</Text>

          {/* Pill badge */}
          <View
            testID={`pill-${verdict.pill.toLowerCase()}`}
            style={[styles.pill, isProportionate ? styles.pillGreen : styles.pillAmber]}
          >
            <Text style={[styles.pillText, isProportionate ? styles.pillTextGreen : styles.pillTextAmber]}>
              {verdict.pill}
            </Text>
          </View>

          {/* Card 1 — What happened */}
          <View style={[styles.card, styles.cardWhat]}>
            <Text style={[styles.cardLabel, styles.cardLabelWhat]}>What happened</Text>
            <Text style={styles.cardBody} testID="verdict-summary">
              {verdict.summary}
            </Text>
          </View>

          {/* Card 2 — What you did well (amber) */}
          <View style={[styles.card, styles.cardWell]} testID="verdict-did-well">
            <Text style={[styles.cardLabel, styles.cardLabelWell]}>
              What {speakerName} did well
            </Text>
            <Text style={styles.cardBody}>{verdict.did_well}</Text>
          </View>

          {/* Card 3 — Could have done differently (rose) */}
          <View style={[styles.card, styles.cardDiff]} testID="verdict-could-differently">
            <Text style={[styles.cardLabel, styles.cardLabelDiff]}>
              Could have done differently
            </Text>
            <Text style={styles.cardBody}>{verdict.could_differently}</Text>
          </View>

          {/* Card 4 — One action (charcoal inverse) */}
          <View style={[styles.card, styles.cardAction]} testID="verdict-one-action">
            <Text style={[styles.cardLabel, styles.cardLabelAction]}>One action</Text>
            <Text style={styles.cardBodyAction}>{verdict.action}</Text>
          </View>

          {/* Return home */}
          <TouchableOpacity
            testID="verdict-done-button"
            onPress={() => router.replace("/")}
            activeOpacity={0.7}
            style={styles.returnBtn}
          >
            <Text style={styles.returnText}>Return home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </GradientScreen>
  );
}

// Gradient wrapper — keeps gradient behind SafeAreaView on both loading and main states
function GradientScreen({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // Top bar
  topBar: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  backBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },

  // Scroll
  scroll: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 52,
  },

  // Header
  caseTitle: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 26,
    lineHeight: 34,
    color: theme.colors.charcoal,
    marginBottom: 14,
  },

  // Pill
  pill: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    marginBottom: 24,
  },
  pillGreen: {
    backgroundColor: "rgba(74,159,107,0.12)",
  },
  pillAmber: {
    backgroundColor: theme.colors.amberSoft,
  },
  pillText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  pillTextGreen: {
    color: "#2D7A4F",
  },
  pillTextAmber: {
    color: "#8A6520",
  },

  // Cards — shared base
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
  },
  cardLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  cardBody: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.charcoal,
  },

  // Card 1 — What happened
  cardWhat: {
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  cardLabelWhat: {
    color: theme.colors.charcoal40,
  },

  // Card 2 — What you did well
  cardWell: {
    backgroundColor: theme.colors.amberSoft,
  },
  cardLabelWell: {
    color: theme.colors.amber,
  },

  // Card 3 — Could have done differently
  cardDiff: {
    backgroundColor: theme.colors.roseSoft,
  },
  cardLabelDiff: {
    color: theme.colors.rose,
  },

  // Card 4 — One action (inverse)
  cardAction: {
    backgroundColor: theme.colors.charcoal,
  },
  cardLabelAction: {
    color: "rgba(247,243,238,0.6)",
  },
  cardBodyAction: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 15,
    lineHeight: 24,
    color: "#F7F3EE",
  },

  // Return home
  returnBtn: {
    marginTop: 28,
    alignItems: "center",
    paddingVertical: 8,
  },
  returnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
    letterSpacing: 0.3,
  },

  // Loading / pending states
  pendingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  pendingText: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    color: theme.colors.charcoal55,
  },
  errorText: {
    fontFamily: theme.fonts.sans,
    color: theme.colors.rose,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
