import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { theme } from "@/src/theme";
import { api } from "@/src/api";
import { getOrCreateUserId, isOnboarded } from "@/src/session";
import { BtnDark, BtnGhost, BtnText } from "@/src/components/ui";

const TEXT_MAX  = 620;  // hero copy, headings, closing CTA
const CARDS_MAX = 960;  // step-card row and nav so 3-col has room

function CenteredView({
  children,
  maxWidth = TEXT_MAX,
  style,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.centered, { maxWidth }, style]}>
      {children}
    </View>
  );
}

function StepCard({
  step,
  title,
  body,
  style,
}: {
  step: string;
  title: string;
  body: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.stepCard, style]}>
      <Text style={styles.stepLabel}>{step}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepBody}>{body}</Text>
    </View>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;

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

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  const handleStart = () => router.push("/case/new");
  const handleJoin  = () => router.push("/join");

  // Step card style: flex:1 so all three share equal width in the row
  const stepCardWide: ViewStyle = { flex: 1, marginBottom: 0 };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient
        colors={["#EDCFC8", "#F5EDE8", "#F9F7F4"]}
        locations={[0, 0.35, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.65 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── NAV BAR ── */}
        <CenteredView maxWidth={CARDS_MAX} style={styles.navBar}>
          <Text style={styles.navBrand}>Be Heard</Text>
          <View style={styles.navRight}>
            <Text style={styles.navTagline}>A CALM BRIDGE BACK</Text>
            <TouchableOpacity
              testID="profile-icon-button"
              onPress={() => router.push("/profile")}
              style={styles.profileBtn}
              activeOpacity={0.7}
            >
              <Feather name="user" size={18} color={theme.colors.charcoal} />
            </TouchableOpacity>
          </View>
        </CenteredView>

        {/* ── HERO ── */}
        <CenteredView maxWidth={TEXT_MAX} style={styles.heroSection}>
          <Text style={styles.heroEyebrow}>FOR COUPLES, AFTER A FIGHT</Text>

          <Text style={styles.h1} testID="brand-title">
            {"A quiet space to find "}
            <Text style={styles.h1Em}>{"your way back"}</Text>
            {"."}
          </Text>

          <Text style={styles.subtext} testID="tagline">
            Both of you share what happened, in your own words. Be Heard
            listens, reflects, and helps you talk through it — gently, and on
            your own time.
          </Text>

          {motivational && (
            <Text testID="motivational-stats" style={styles.motivational}>
              {motivational}
            </Text>
          )}

          <View style={styles.btnStack}>
            <BtnDark
              testID="start-case-button"
              label="Start a conversation"
              onPress={handleStart}
            />
            <BtnGhost label="Join a conversation" onPress={handleJoin} />
          </View>

          <Text style={styles.privateNote}>
            Private. No account needed to begin.
          </Text>
        </CenteredView>

        {/* ── HOW IT WORKS ── */}
        {/* Heading/subtitle stay narrow; card row stretches to CARDS_MAX */}
        <View style={styles.sectionWrap}>
          <CenteredView maxWidth={TEXT_MAX}>
            <Text style={styles.sectionTitle}>How it works</Text>
            <Text style={styles.sectionSub}>
              Three gentle steps. No rush, no scoring, no winners.
            </Text>
          </CenteredView>

          <CenteredView maxWidth={CARDS_MAX}>
            <View
              style={[
                styles.stepRow,
                isWide ? styles.stepRowWide : styles.stepRowNarrow,
              ]}
            >
              <StepCard
                step="STEP ONE"
                title="Share your side, privately"
                body="Each of you writes what happened on your own device. Your partner doesn't see your words."
                style={isWide ? stepCardWide : undefined}
              />
              <StepCard
                step="STEP TWO"
                title="Hear what you each really meant"
                body="Be Heard reflects back the feeling underneath the words, in neutral, kind language."
                style={isWide ? stepCardWide : undefined}
              />
              <StepCard
                step="STEP THREE"
                title="Three rounds, then a takeaway"
                body="You work through it in three quiet exchanges. At the end, each of you gets your own honest takeaway."
                style={isWide ? stepCardWide : undefined}
              />
            </View>
          </CenteredView>
        </View>

        {/* ── REASSURANCE ── */}
        <View style={styles.sectionWrap}>
          <CenteredView maxWidth={TEXT_MAX}>
            <Text style={styles.reassureTitle}>
              {"It's just a place to be heard — "}
              <Text style={styles.reassureTitleEm}>{"by each other."}</Text>
            </Text>
          </CenteredView>

          <CenteredView maxWidth={isWide ? 740 : TEXT_MAX}>
            <View style={styles.featureRow}>
              <FeatureCard
                title="Private"
                body="Your words stay between the two of you. No feeds, no audience."
              />
              <FeatureCard
                title="Not therapy"
                body="We're not a clinician. We're a calm room while you talk."
              />
            </View>
            <View style={styles.featureRow}>
              <FeatureCard
                title="No sides"
                body="Be Heard isn't here to decide who was right."
              />
              <FeatureCard
                title="A bridge back"
                body="Just a way to get back to each other after a hard moment."
              />
            </View>
          </CenteredView>
        </View>

        {/* ── CLOSING CTA ── */}
        <CenteredView maxWidth={TEXT_MAX} style={styles.closingWrap}>
          <Text style={styles.closingTitle}>When you're ready, we're here.</Text>
          <Text style={styles.closingSub}>
            Begin together, or send a quiet invitation to your partner.
          </Text>

          <View style={styles.btnStack}>
            <BtnDark label="Start a conversation" onPress={handleStart} />
            <BtnGhost label="Join a conversation" onPress={handleJoin} />
          </View>

          <BtnText
            label="View past conversations"
            onPress={() => router.push("/cases")}
          />
        </CenteredView>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },

  // Base centering container — maxWidth injected per-section
  centered: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 28,
  },

  // ── Nav bar ──────────────────────────────────────────────────────────────
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 16,
  },
  navBrand: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 18,
    color: theme.colors.charcoal,
    letterSpacing: 0.2,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  navTagline: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    color: theme.colors.charcoal40,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.charcoal18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.offWhite,
    ...theme.shadow.card,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  heroSection: {
    paddingTop: 64,
    paddingBottom: 96,
  },
  heroEyebrow: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 2.5,
    color: theme.colors.charcoal40,
    textAlign: "center",
    marginBottom: 32,
  },
  h1: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 40,
    lineHeight: 52,
    color: theme.colors.charcoal,
    textAlign: "center",
    marginBottom: 32,
  },
  h1Em: {
    fontFamily: theme.fonts.serifMediumItalic,
    color: theme.colors.rose,
  },
  subtext: {
    fontFamily: theme.fonts.sans,
    fontSize: 17,
    lineHeight: 30,
    color: theme.colors.charcoal55,
    textAlign: "center",
    marginBottom: 8,
  },
  motivational: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    textAlign: "center",
    letterSpacing: 0.2,
    marginTop: 8,
  },
  btnStack: {
    gap: 12,
    marginTop: 44,
  },
  privateNote: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.charcoal40,
    textAlign: "center",
    marginTop: 22,
    letterSpacing: 0.1,
  },

  // ── Section shared ────────────────────────────────────────────────────────
  sectionWrap: {
    paddingTop: 80,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 32,
    color: theme.colors.charcoal,
    textAlign: "center",
    marginBottom: 14,
  },
  sectionSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    lineHeight: 26,
    color: theme.colors.charcoal55,
    textAlign: "center",
    marginBottom: 48,
  },

  // ── Step cards ────────────────────────────────────────────────────────────
  stepRow: {
    // direction and gap set by stepRowWide / stepRowNarrow below
  },
  stepRowWide: {
    flexDirection: "row",
    gap: 18,
  },
  stepRowNarrow: {
    flexDirection: "column",
    gap: 12,
  },
  stepCard: {
    backgroundColor: theme.colors.offWhite,
    borderWidth: 1,
    borderColor: theme.colors.charcoal06,
    borderRadius: theme.radius.card,
    padding: 22,
    marginBottom: 0, // gap handles spacing in both orientations
    ...theme.shadow.card,
  },
  stepLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    color: theme.colors.charcoal40,
    marginBottom: 14,
  },
  stepTitle: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 20,
    lineHeight: 28,
    color: theme.colors.charcoal,
    marginBottom: 10,
  },
  stepBody: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    lineHeight: 24,
    color: theme.colors.charcoal55,
  },

  // ── Reassurance ───────────────────────────────────────────────────────────
  reassureTitle: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 28,
    lineHeight: 40,
    color: theme.colors.charcoal,
    textAlign: "center",
    marginBottom: 40,
  },
  reassureTitleEm: {
    fontFamily: theme.fonts.serifMediumItalic,
    color: theme.colors.rose,
  },
  featureRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: theme.colors.offWhite,
    borderWidth: 1,
    borderColor: theme.colors.charcoal06,
    borderRadius: theme.radius.card,
    padding: 18,
    ...theme.shadow.card,
  },
  featureTitle: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 16,
    color: theme.colors.charcoal,
    marginBottom: 8,
  },
  featureBody: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    lineHeight: 21,
    color: theme.colors.charcoal55,
  },

  // ── Closing CTA ───────────────────────────────────────────────────────────
  closingWrap: {
    paddingTop: 80,
    paddingBottom: 80,
  },
  closingTitle: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 34,
    lineHeight: 44,
    color: theme.colors.charcoal,
    textAlign: "center",
    marginBottom: 18,
  },
  closingSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    lineHeight: 28,
    color: theme.colors.charcoal55,
    textAlign: "center",
  },
});
