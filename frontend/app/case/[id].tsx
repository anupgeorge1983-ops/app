import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { theme } from "@/src/theme";
import { api, Case } from "@/src/api";
import { MicButton } from "@/src/components/MicButton";
import { Eyebrow, MirrorCard } from "@/src/components/ui";

type Stage = Case["stage"];

function partnerOf(stage: Stage): "a" | "b" {
  return stage.startsWith("a_") ? "a" : "b";
}
function roundOf(stage: Stage): 1 | 2 | 3 {
  if (stage.includes("r1")) return 1;
  if (stage.includes("r2")) return 2;
  return 3;
}
function isInputStage(stage: Stage) {
  return stage.endsWith("_input");
}
function isMirrorStage(stage: Stage) {
  return stage.endsWith("_mirror");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen — all logic identical to before
// ─────────────────────────────────────────────────────────────────────────────
export default function CaseFlow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustText, setAdjustText] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const c = await api.getCase(id);
      setCaseData(c);
      if (c.stage === "verdict_ready") {
        router.replace(`/verdict/${c.id}`);
      }
    } catch (e: any) {
      setError(e?.message || "Could not load case.");
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  if (!caseData) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ActivityIndicator color={theme.colors.rose} style={{ marginTop: 80 }} />
        {error && <Text style={styles.error}>{error}</Text>}
      </SafeAreaView>
    );
  }

  const stage = caseData.stage as Stage;
  const partner = partnerOf(stage);
  const round = roundOf(stage);
  const speakerName = partner === "a" ? caseData.partner_a_name : caseData.partner_b_name;
  const otherName   = partner === "a" ? caseData.partner_b_name : caseData.partner_a_name;

  const onSubmit = async () => {
    if (!isInputStage(stage)) return;
    if (text.trim().length < 4) {
      setError("Share a few more words so we can mirror it back.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const updated = await api.submit(caseData.id, { partner, round, text: text.trim() });
      setCaseData(updated);
      setText("");
      if (updated.stage === "verdict_ready") {
        router.replace(`/verdict/${updated.id}`);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onConfirmMirror = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.confirmMirror(caseData.id, { partner, round, action: "confirm" });
      setCaseData(updated);
      if (updated.stage === "verdict_ready") {
        router.replace(`/verdict/${updated.id}`);
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onAdjustMirror = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.confirmMirror(caseData.id, {
        partner,
        round,
        action: "adjust",
        adjusted_text: adjustText.trim() || undefined,
      });
      setCaseData(updated);
      setAdjustMode(false);
      setAdjustText("");
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const onShareWhatsApp = async () => {
    try {
      await Share.share({
        message: `I started a case on Be Heard so we can talk this through calmly. Open the app and join: case ${caseData.id}`,
      });
    } catch {}
  };

  const showWaitingScreen =
    (stage === "b_r1_input" && caseData.a_r1.confirmed) ||
    (stage === "b_r2_input" && caseData.a_r2.confirmed) ||
    (stage === "b_r3_input" && caseData.a_r3.confirmed);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Top bar: back + round dots ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            testID="case-back-button"
            onPress={() => router.replace("/")}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.dotsRow}>
            {[1, 2, 3].map((r) => (
              <View
                key={r}
                style={[styles.dot, r <= round && styles.dotActive]}
              />
            ))}
          </View>

          {/* Balance spacer so dots stay centred */}
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {showWaitingScreen && (
            <HandoffCard
              speakerName={speakerName}
              otherName={otherName}
              round={round}
              onContinue={() => {}}
              onShare={onShareWhatsApp}
            />
          )}

          {isInputStage(stage) && (
            <InputBlock
              speakerName={speakerName}
              otherName={otherName}
              round={round}
              question={
                round === 1
                  ? null
                  : partner === "a"
                  ? round === 2 ? caseData.a_r2_question : caseData.a_r3_question
                  : round === 2 ? caseData.b_r2_question : caseData.b_r3_question
              }
              partnerMirror={
                round === 2
                  ? partner === "a" ? caseData.b_r1.mirror : caseData.a_r1.mirror
                  : null
              }
              partnerName={otherName}
              text={text}
              setText={setText}
              busy={busy}
              onSubmit={onSubmit}
              error={error}
            />
          )}

          {isMirrorStage(stage) && (
            <MirrorBlock
              speakerName={speakerName}
              mirror={partner === "a" ? caseData.a_r1.mirror : caseData.b_r1.mirror}
              busy={busy}
              adjustMode={adjustMode}
              adjustText={adjustText}
              setAdjustText={setAdjustText}
              onSetAdjustMode={setAdjustMode}
              onConfirm={onConfirmMirror}
              onAdjust={onAdjustMirror}
              error={error}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HandoffCard — shown when it's partner B's turn
// ─────────────────────────────────────────────────────────────────────────────
function HandoffCard({
  speakerName,
  otherName,
  round,
  onShare,
}: {
  speakerName: string;
  otherName: string;
  round: number;
  onContinue: () => void;
  onShare: () => void;
}) {
  return (
    <View style={hStyles.card} testID="handoff-card">
      <View style={hStyles.iconCircle}>
        <Feather name="clock" size={22} color={theme.colors.amber} />
      </View>

      <Text style={hStyles.title}>{otherName}&apos;s turn</Text>

      <Text style={hStyles.body}>
        Hand the phone to{" "}
        <Text style={hStyles.nameHighlight}>{speakerName}</Text>.
        {" "}They&apos;ll share their side below. Neither of you will see the
        other&apos;s side until both have shared.
      </Text>

      <TouchableOpacity
        testID="share-whatsapp-button"
        onPress={onShare}
        activeOpacity={0.85}
        style={hStyles.shareBtn}
      >
        <Feather name="message-circle" size={18} color="#fff" />
        <Text style={hStyles.shareBtnText}>Share via WhatsApp</Text>
      </TouchableOpacity>

      {round > 1 && (
        <Text style={hStyles.note}>Round {round} of 3</Text>
      )}
      <Text style={hStyles.note}>
        You&apos;ll both be notified when it&apos;s time for the next round.
      </Text>
    </View>
  );
}

const hStyles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: theme.colors.creamWarm,
    borderRadius: theme.radius.card,
    padding: 28,
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.amberSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 22,
    color: theme.colors.charcoal,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    color: theme.colors.charcoal55,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  nameHighlight: {
    fontFamily: theme.fonts.sansMedium,
    color: theme.colors.charcoal,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  shareBtnText: {
    fontFamily: theme.fonts.sansMedium,
    color: "#F7F3EE",
    fontSize: 15,
  },
  note: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    textAlign: "center",
    marginTop: 4,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// InputBlock — text / voice entry for each round
// ─────────────────────────────────────────────────────────────────────────────
function InputBlock({
  speakerName,
  round,
  question,
  partnerMirror,
  partnerName,
  text,
  setText,
  busy,
  onSubmit,
  error,
}: {
  speakerName: string;
  otherName: string;
  round: 1 | 2 | 3;
  question: string | null;
  partnerMirror: string | null;
  partnerName: string;
  text: string;
  setText: (s: string) => void;
  busy: boolean;
  onSubmit: () => void;
  error: string | null;
}) {
  const isReady = !busy && text.trim().length >= 4;

  return (
    <View style={iStyles.container}>
      {/* Heading */}
      <Text style={iStyles.h2}>
        {round === 1 ? `${speakerName} — your side` : `${speakerName}, your turn`}
      </Text>

      {round === 1 && (
        <Text style={iStyles.sub}>
          Describe what happened. Your partner won&apos;t see this until they share their side.
        </Text>
      )}

      {/* Round 2: partner's mirror shown as a letter-style card */}
      {round === 2 && partnerMirror && (
        <View testID="partner-mirror-pullquote" style={iStyles.partnerCard}>
          <View style={iStyles.partnerAccent} />
          <Text style={iStyles.partnerLabel}>{partnerName} felt</Text>
          <Text style={iStyles.partnerText}>&ldquo;{partnerMirror}&rdquo;</Text>
        </View>
      )}

      {/* Round 2/3: guiding question */}
      {(round === 2 || round === 3) && question && (
        <View style={iStyles.questionCard} testID="round-question-card">
          <Text style={iStyles.questionText}>{question}</Text>
        </View>
      )}

      {round === 3 && (
        <Text style={iStyles.finalNote}>Your last response before the verdict.</Text>
      )}

      {/* Voice input row */}
      <View style={iStyles.voiceRow}>
        <MicButton
          onTranscribed={(t) => setText((prev) => (prev ? prev.trim() + " " + t : t))}
          size="small"
        />
        <Text style={iStyles.voiceLabel}>
          {round === 1
            ? "Tap to speak your side — easier than typing when upset."
            : "Tap to speak your reply."}
        </Text>
      </View>

      {/* Divider */}
      <View style={iStyles.dividerRow}>
        <View style={iStyles.dividerLine} />
        <Text style={iStyles.dividerText}>or write it</Text>
        <View style={iStyles.dividerLine} />
      </View>

      {/* Text input */}
      <TextInput
        testID="round-input"
        value={text}
        onChangeText={setText}
        placeholder={round === 1 ? "Tell us what happened…" : "Your response…"}
        placeholderTextColor={theme.colors.charcoal40}
        style={iStyles.textArea}
        multiline
        textAlignVertical="top"
      />

      {error && <Text testID="case-error" style={iStyles.error}>{error}</Text>}

      {/* Submit */}
      <TouchableOpacity
        testID="submit-round-button"
        disabled={!isReady}
        onPress={onSubmit}
        activeOpacity={0.85}
        style={[
          iStyles.submitBtn,
          round === 3 && iStyles.submitBtnRose,
          !isReady && iStyles.submitBtnDisabled,
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={iStyles.submitBtnText}>
            {round === 3 ? "I'm ready for the verdict" : "Continue →"}
          </Text>
        )}
      </TouchableOpacity>

      {busy && round === 1 && (
        <Text style={iStyles.busyNote}>Mirroring back what you meant…</Text>
      )}
    </View>
  );
}

const iStyles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  h2: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 26,
    lineHeight: 34,
    color: theme.colors.charcoal,
    marginBottom: 10,
  },
  sub: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.charcoal55,
    marginBottom: 4,
  },
  finalNote: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.charcoal40,
    marginTop: 8,
    marginBottom: 4,
  },

  // Partner mirror (round 2)
  partnerCard: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.card,
    padding: 20,
    marginTop: 16,
    marginBottom: 4,
    ...theme.shadow.card,
    overflow: "hidden",
  },
  partnerAccent: {
    width: 28,
    height: 2,
    borderRadius: 2,
    backgroundColor: theme.colors.amber,
    marginBottom: 14,
  },
  partnerLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    color: theme.colors.charcoal40,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  partnerText: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.charcoal,
  },

  // Guiding question (rounds 2–3)
  questionCard: {
    backgroundColor: theme.colors.creamWarm,
    borderRadius: theme.radius.input,
    padding: 18,
    marginTop: 16,
    marginBottom: 4,
  },
  questionText: {
    fontFamily: theme.fonts.serifItalic,
    fontSize: 17,
    lineHeight: 28,
    color: theme.colors.charcoal,
  },

  // Voice row
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.button,
    padding: 14,
    marginTop: 20,
    ...theme.shadow.card,
  },
  voiceLabel: {
    flex: 1,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal55,
    lineHeight: 20,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.charcoal18,
  },
  dividerText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
  },

  // Text area
  textArea: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.charcoal18,
    padding: 16,
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    color: theme.colors.charcoal,
    minHeight: 130,
    ...theme.shadow.card,
  },

  // Buttons
  submitBtn: {
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnRose: {
    backgroundColor: theme.colors.rose,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    fontFamily: theme.fonts.sansMedium,
    color: "#F7F3EE",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  busyNote: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    textAlign: "center",
    marginTop: 12,
  },

  error: {
    fontFamily: theme.fonts.sans,
    color: theme.colors.rose,
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MirrorBlock — AI-mirrored version of what the user said
// ─────────────────────────────────────────────────────────────────────────────
function MirrorBlock({
  speakerName,
  mirror,
  busy,
  adjustMode,
  adjustText,
  setAdjustText,
  onSetAdjustMode,
  onConfirm,
  onAdjust,
  error,
}: {
  speakerName: string;
  mirror: string;
  busy: boolean;
  adjustMode: boolean;
  adjustText: string;
  setAdjustText: (s: string) => void;
  onSetAdjustMode: (v: boolean) => void;
  onConfirm: () => void;
  onAdjust: () => void;
  error: string | null;
}) {
  return (
    <View style={mStyles.container}>
      <Eyebrow label="Here's what we heard" />

      <View testID="mirror-card">
        <MirrorCard text={`"${mirror}"`} />
      </View>

      <Text style={mStyles.confirm}>Does this capture what you meant?</Text>
      <Text style={mStyles.note}>
        Your partner will respond to this, not your exact words.
      </Text>

      {!adjustMode ? (
        <View style={mStyles.btnGroup}>
          <TouchableOpacity
            testID="confirm-mirror-button"
            disabled={busy}
            onPress={onConfirm}
            activeOpacity={0.85}
            style={[mStyles.btnRose, busy && mStyles.btnDisabled]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={mStyles.btnRoseText}>Yes, that&apos;s right</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            testID="adjust-mirror-button"
            disabled={busy}
            onPress={() => onSetAdjustMode(true)}
            activeOpacity={0.7}
            style={[mStyles.btnGhost, busy && mStyles.btnDisabled]}
          >
            <Text style={mStyles.btnGhostText}>Let me adjust</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={mStyles.adjustContainer}>
          <Text style={mStyles.adjustLabel}>What did we miss?</Text>

          <View style={mStyles.voiceRow}>
            <MicButton
              onTranscribed={(t) => setAdjustText((prev) => (prev ? prev.trim() + " " + t : t))}
              size="small"
            />
            <Text style={mStyles.voiceLabel}>Or tap to speak</Text>
          </View>

          <TextInput
            testID="adjust-mirror-input"
            value={adjustText}
            onChangeText={setAdjustText}
            placeholder="Add what we should have picked up…"
            placeholderTextColor={theme.colors.charcoal40}
            style={mStyles.textArea}
            multiline
            textAlignVertical="top"
          />

          <View style={mStyles.btnGroup}>
            <TouchableOpacity
              testID="regenerate-mirror-button"
              disabled={busy}
              onPress={onAdjust}
              activeOpacity={0.85}
              style={[mStyles.btnDark, busy && mStyles.btnDisabled]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={mStyles.btnDarkText}>Try again</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="adjust-cancel-button"
              disabled={busy}
              onPress={() => onSetAdjustMode(false)}
              activeOpacity={0.7}
              style={[mStyles.btnGhost, busy && mStyles.btnDisabled]}
            >
              <Text style={mStyles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {error && <Text style={mStyles.error}>{error}</Text>}
    </View>
  );
}

const mStyles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  confirm: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    color: theme.colors.charcoal55,
    textAlign: "center",
    marginTop: 4,
  },
  note: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 4,
  },

  // Adjust mode
  adjustContainer: {
    marginTop: 8,
  },
  adjustLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 13,
    color: theme.colors.charcoal55,
    marginBottom: 4,
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.button,
    padding: 14,
    marginTop: 12,
    marginBottom: 4,
    ...theme.shadow.card,
  },
  voiceLabel: {
    flex: 1,
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal55,
  },
  textArea: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.charcoal18,
    padding: 16,
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    color: theme.colors.charcoal,
    minHeight: 110,
    marginTop: 12,
    ...theme.shadow.card,
  },

  // Button group
  btnGroup: {
    gap: 10,
    marginTop: 20,
  },
  btnRose: {
    backgroundColor: theme.colors.rose,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
  },
  btnRoseText: {
    fontFamily: theme.fonts.sansMedium,
    color: "#fff",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnDark: {
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
  },
  btnDarkText: {
    fontFamily: theme.fonts.sansMedium,
    color: "#F7F3EE",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnGhost: {
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: theme.colors.charcoal18,
  },
  btnGhostText: {
    fontFamily: theme.fonts.sansMedium,
    color: theme.colors.charcoal,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnDisabled: { opacity: 0.45 },

  error: {
    fontFamily: theme.fonts.sans,
    color: theme.colors.rose,
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen-level styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    paddingVertical: 6,
    minWidth: 60,
  },
  backBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.charcoal18,
  },
  dotActive: {
    backgroundColor: theme.colors.charcoal,
  },
  topBarSpacer: {
    minWidth: 60,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },

  error: {
    fontFamily: theme.fonts.sans,
    color: theme.colors.rose,
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
