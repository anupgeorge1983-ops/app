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

  const stage = caseData.stage as Stage;
  const partner = partnerOf(stage);
  const round = roundOf(stage);
  const speakerName =
    partner === "a" ? caseData.partner_a_name : caseData.partner_b_name;
  const otherName =
    partner === "a" ? caseData.partner_b_name : caseData.partner_a_name;

  const onSubmit = async () => {
    if (!isInputStage(stage)) return;
    if (text.trim().length < 4) {
      setError("Share a few more words so we can mirror it back.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const updated = await api.submit(caseData.id, {
        partner,
        round,
        text: text.trim(),
      });
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
      const updated = await api.confirmMirror(caseData.id, {
        partner,
        round,
        action: "confirm",
      });
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

  // ----- Determine what to render -----
  const showWaitingScreen =
    (stage === "b_r1_input" && caseData.a_r1.confirmed) ||
    (stage === "b_r2_input" && caseData.a_r2.confirmed) ||
    (stage === "b_r3_input" && caseData.a_r3.confirmed);
  // we'll show "Partner's turn" handoff for these b_ stages

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            testID="case-back-button"
            onPress={() => router.replace("/")}
            style={{ width: 40, height: 40, justifyContent: "center" }}
          >
            <Feather name="arrow-left" size={22} color={theme.colors.textHeading} />
          </TouchableOpacity>
          <View style={styles.dotsRow}>
            {[1, 2, 3].map((r) => (
              <View
                key={r}
                style={[
                  styles.dot,
                  r <= round && { backgroundColor: theme.colors.primary },
                ]}
              />
            ))}
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.roundLabel}>
          Round {round} of 3{round === 3 ? " · Final" : ""}
        </Text>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* HANDOFF: when it becomes B's turn for any round */}
          {showWaitingScreen ? (
            <HandoffCard
              speakerName={speakerName}
              otherName={otherName}
              round={round}
              onContinue={() => {
                // simply stays here; user proceeds by typing into the input below
              }}
              onShare={onShareWhatsApp}
            />
          ) : null}

          {/* INPUT STAGE */}
          {isInputStage(stage) && (
            <InputBlock
              speakerName={speakerName}
              otherName={otherName}
              round={round}
              question={
                round === 1
                  ? null
                  : partner === "a"
                  ? round === 2
                    ? caseData.a_r2_question
                    : caseData.a_r3_question
                  : round === 2
                  ? caseData.b_r2_question
                  : caseData.b_r3_question
              }
              partnerMirror={
                round === 2
                  ? partner === "a"
                    ? caseData.b_r1.mirror
                    : caseData.a_r1.mirror
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

          {/* MIRROR STAGE */}
          {isMirrorStage(stage) && (
            <MirrorBlock
              speakerName={speakerName}
              mirror={
                partner === "a"
                  ? caseData.a_r1.mirror
                  : caseData.b_r1.mirror
              }
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

// ============= Components =============

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
    <View style={styles.handoff} testID="handoff-card">
      <View style={styles.clockCircle}>
        <Feather name="clock" size={22} color={theme.colors.primary} />
      </View>
      <Text style={styles.h2Center}>
        {otherName}&apos;s turn{round > 1 ? "" : ""}
      </Text>
      <Text style={styles.subCenter}>
        Hand the phone to <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>{speakerName}</Text>.
        They&apos;ll share their side below. Neither of you will see the other&apos;s
        side until both have shared.
      </Text>
      <TouchableOpacity
        testID="share-whatsapp-button"
        onPress={onShare}
        activeOpacity={0.85}
        style={styles.whatsappBtn}
      >
        <Feather name="message-circle" size={18} color="#fff" />
        <Text style={styles.whatsappText}>Share via WhatsApp</Text>
      </TouchableOpacity>
      <Text style={styles.tinyNote}>
        You&apos;ll both be notified when it&apos;s time for the next round.
      </Text>
    </View>
  );
}

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
  return (
    <View>
      <Text style={styles.h1}>
        {round === 1 ? `${speakerName} — your side` : `${speakerName}, your turn`}
      </Text>

      {round === 1 && (
        <Text style={styles.sub}>
          Describe what happened. Your partner won&apos;t see this until they share their
          side.
        </Text>
      )}

      {round === 2 && partnerMirror && (
        <View testID="partner-mirror-pullquote" style={styles.pullQuote}>
          <Text style={styles.pullLabel}>{partnerName} FELT</Text>
          <Text style={styles.pullText}>&ldquo;{partnerMirror}&rdquo;</Text>
        </View>
      )}

      {(round === 2 || round === 3) && question && (
        <View style={styles.mirrorCard} testID="round-question-card">
          <Text style={styles.mirrorItalic}>{question}</Text>
        </View>
      )}

      {round === 3 && (
        <Text style={styles.subSmall}>Your last response before the verdict.</Text>
      )}

      <TextInput
        testID="round-input"
        value={text}
        onChangeText={setText}
        placeholder={round === 1 ? "Tell us what happened…" : "Your response…"}
        placeholderTextColor={theme.colors.textSubtle}
        style={styles.textArea}
        multiline
        textAlignVertical="top"
      />

      {error && <Text testID="case-error" style={styles.error}>{error}</Text>}

      <TouchableOpacity
        testID="submit-round-button"
        disabled={busy || text.trim().length < 4}
        onPress={onSubmit}
        activeOpacity={0.85}
        style={[
          styles.primaryBtn,
          (busy || text.trim().length < 4) && { opacity: 0.55 },
        ]}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Submit</Text>
        )}
      </TouchableOpacity>
      {busy && round === 1 && (
        <Text style={styles.tinyNote}>Mirroring back what you meant…</Text>
      )}
    </View>
  );
}

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
    <View>
      <Text style={styles.tinyLabel}>WE HEARD {speakerName.toUpperCase()} SAY</Text>
      <View style={styles.mirrorCard} testID="mirror-card">
        <Text style={styles.mirrorItalic}>&ldquo;{mirror}&rdquo;</Text>
      </View>
      <Text style={styles.subSmall}>Does this capture what you meant?</Text>

      {!adjustMode ? (
        <>
          <TouchableOpacity
            testID="confirm-mirror-button"
            disabled={busy}
            onPress={onConfirm}
            activeOpacity={0.85}
            style={[styles.primaryBtn, busy && { opacity: 0.55 }]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Yes, that&apos;s right</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            testID="adjust-mirror-button"
            disabled={busy}
            onPress={() => onSetAdjustMode(true)}
            activeOpacity={0.85}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Let me adjust</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={{ marginTop: theme.spacing.md }}>
          <Text style={styles.label}>What did we miss?</Text>
          <TextInput
            testID="adjust-mirror-input"
            value={adjustText}
            onChangeText={setAdjustText}
            placeholder="Add what we should have picked up…"
            placeholderTextColor={theme.colors.textSubtle}
            style={styles.textArea}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            testID="regenerate-mirror-button"
            disabled={busy}
            onPress={onAdjust}
            activeOpacity={0.85}
            style={[styles.primaryBtn, busy && { opacity: 0.55 }]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Try again</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            testID="adjust-cancel-button"
            disabled={busy}
            onPress={() => onSetAdjustMode(false)}
            activeOpacity={0.85}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={[styles.tinyNote, { marginTop: theme.spacing.md }]}>
        Your partner will respond to this, not your exact words.
      </Text>
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
  dotsRow: { flexDirection: "row", gap: 8 },
  dot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.borderSoft,
  },
  roundLabel: {
    fontSize: 13,
    color: theme.colors.textSubtle,
    fontWeight: "500",
    textAlign: "center",
    marginTop: theme.spacing.md,
  },
  scroll: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  h1: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textHeading,
    letterSpacing: -0.5,
    marginTop: theme.spacing.md,
  },
  sub: {
    fontSize: 15,
    color: theme.colors.textBody,
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  subSmall: {
    fontSize: 13,
    color: theme.colors.textSubtle,
    marginTop: theme.spacing.md,
  },
  tinyLabel: {
    fontSize: 11,
    color: theme.colors.textSubtle,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  tinyNote: {
    fontSize: 12,
    color: theme.colors.textSubtle,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  mirrorCard: {
    backgroundColor: theme.colors.primaryTintStrong,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  mirrorItalic: {
    fontSize: 17,
    color: theme.colors.textHeading,
    fontStyle: "italic",
    lineHeight: 26,
  },
  pullQuote: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
    paddingLeft: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  pullLabel: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  pullText: {
    fontSize: 16,
    color: theme.colors.textHeading,
    fontStyle: "italic",
    lineHeight: 24,
    marginTop: 6,
  },
  textArea: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textHeading,
    minHeight: 140,
    marginTop: theme.spacing.md,
  },
  label: { fontSize: 13, color: theme.colors.textBody, fontWeight: "600" },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: theme.spacing.lg,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryBtn: {
    borderRadius: theme.radius.button,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  secondaryBtnText: {
    color: theme.colors.textBody,
    fontSize: 15,
    fontWeight: "600",
  },
  error: {
    color: theme.colors.danger,
    fontSize: 14,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  handoff: {
    alignItems: "center",
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.primaryTint,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    marginBottom: theme.spacing.lg,
  },
  clockCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  h2Center: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textHeading,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  subCenter: {
    fontSize: 14,
    color: theme.colors.textBody,
    textAlign: "center",
    marginTop: theme.spacing.sm,
    lineHeight: 21,
  },
  whatsappBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.button,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  whatsappText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
