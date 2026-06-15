import { useEffect, useRef, useState, useCallback } from "react";
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
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { theme } from "@/src/theme";
import { api, Case } from "@/src/api";
import { getOrCreateUserId } from "@/src/session";
import { MicButton } from "@/src/components/MicButton";
import { Eyebrow, MirrorCard, BreathingCircle } from "@/src/components/ui";

type Stage = Case["stage"];

function roundOf(stage: Stage): 1 | 2 | 3 {
  if (stage.includes("r1")) return 1;
  if (stage.includes("r2")) return 2;
  return 3;
}
function isInputStage(stage: Stage) { return stage.endsWith("_input"); }
function isMirrorStage(stage: Stage) { return stage.endsWith("_mirror"); }

// ─────────────────────────────────────────────────────────────────────────────
// CaseFlow — main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function CaseFlow() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustMode, setAdjustMode] = useState(false);
  const [adjustText, setAdjustText] = useState("");

  // ── Role derivation ────────────────────────────────────────────────────────
  // case.user_id is the user_id that Partner A passed when creating the case.
  // Every device has a stable local user_id from getOrCreateUserId().
  // Matching → Partner A, different → Partner B. No session changes needed.
  const myRole: "a" | "b" | null =
    myUserId && caseData ? (myUserId === caseData.user_id ? "a" : "b") : null;

  const stage = (caseData?.stage ?? "") as Stage;
  const isMyTurn  = myRole != null && stage.startsWith(myRole + "_");
  const round     = roundOf(stage);
  const myName    = myRole === "a" ? caseData?.partner_a_name : caseData?.partner_b_name;
  const otherName = myRole === "a" ? caseData?.partner_b_name : caseData?.partner_a_name;

  // Waiting = data loaded + it's not my turn + not yet at verdict
  const isWaiting =
    myRole != null && caseData != null && !isMyTurn && stage !== "verdict_ready";

  // ── Polling refs ───────────────────────────────────────────────────────────
  // isWaitingRef is kept in sync every render so AppState / focus callbacks
  // can read current state without needing to be re-created on every change.
  const isWaitingRef = useRef(false);
  isWaitingRef.current = isWaiting;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetchers ──────────────────────────────────────────────────────────
  // Initial load: also resolves the device's user_id to establish role.
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [c, uid] = await Promise.all([
        api.getCase(id as string),
        getOrCreateUserId(),
      ]);
      setMyUserId(uid);
      setCaseData(c);
      if (c.stage === "verdict_ready") {
        router.replace(`/verdict/${c.id}`);
      }
    } catch (e: any) {
      setError(e?.message || "Could not load case.");
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // Lightweight poll: only updates case data (user_id already known).
  const fetchLatest = useCallback(async () => {
    if (!id) return;
    try {
      const c = await api.getCase(id as string);
      setCaseData(c);
      if (c.stage === "verdict_ready") {
        router.replace(`/verdict/${c.id}`);
      }
    } catch {
      // Silent — next tick will retry.
    }
  }, [id, router]);

  // ── Interval helpers ───────────────────────────────────────────────────────
  const clearPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const schedulePolling = useCallback(() => {
    clearPolling();
    intervalRef.current = setInterval(fetchLatest, 4000);
  }, [fetchLatest, clearPolling]);

  // ── Effect 1: start/stop interval when waiting state changes ──────────────
  useEffect(() => {
    if (isWaiting) {
      schedulePolling();
    } else {
      clearPolling();
    }
    return clearPolling; // cleanup on unmount or when deps change
  }, [isWaiting, schedulePolling, clearPolling]);

  // ── Effect 2: AppState — pause when backgrounded, resume when foregrounded ─
  // Expo Go (and many RN apps) suspend the JS timer loop when the app goes to
  // the background. Re-creating the interval on "active" ensures we don't leave
  // a partner stuck on the waiting screen after switching apps.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isWaitingRef.current) {
        fetchLatest();    // immediate refresh so they don't wait 4 more seconds
        schedulePolling(); // fresh interval from now
      } else if (nextState !== "active") {
        clearPolling();   // don't burn CPU/battery in background
      }
    });
    return () => sub.remove();
  }, [fetchLatest, schedulePolling, clearPolling]);

  // ── Effect 3: screen focus — resume when returning from another screen ─────
  useFocusEffect(
    useCallback(() => {
      // useFocusEffect fires on initial mount too; isWaitingRef guards against
      // starting polling before caseData is loaded.
      if (isWaitingRef.current) {
        fetchLatest();
        schedulePolling();
      }
      return clearPolling; // stop when navigating away
    }, [fetchLatest, schedulePolling, clearPolling])
  );

  // ── Action handlers — all use myRole, not the stage-derived partner ────────
  const onSubmit = async () => {
    if (!isInputStage(stage) || !myRole) return;
    if (text.trim().length < 4) {
      setError("Share a few more words so we can mirror it back.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const updated = await api.submit(caseData!.id, {
        partner: myRole,
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
    if (!myRole) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.confirmMirror(caseData!.id, {
        partner: myRole,
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
    if (!myRole) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.confirmMirror(caseData!.id, {
        partner: myRole,
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
    if (!caseData) return;
    try {
      await Share.share({
        message: `I started a case on Be Heard so we can talk this through calmly. Open the app and join: case ${caseData.id}`,
      });
    } catch {}
  };

  // ── Mirror text for current round (fixes pre-existing r1-only bug) ─────────
  const currentMirror = (() => {
    if (!caseData || !myRole) return "";
    const subs = myRole === "a"
      ? [caseData.a_r1, caseData.a_r2, caseData.a_r3]
      : [caseData.b_r1, caseData.b_r2, caseData.b_r3];
    return subs[round - 1]?.mirror ?? "";
  })();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!caseData || !myRole) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ActivityIndicator color={theme.colors.rose} style={{ marginTop: 80 }} />
        {error && <Text style={styles.error}>{error}</Text>}
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Top bar — always visible */}
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
              <View key={r} style={[styles.dot, r <= round && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.topBarSpacer} />
        </View>

        {/* Waiting screen — shown when it's the other partner's turn */}
        {isWaiting && (
          <WaitingScreen
            otherName={otherName ?? "your partner"}
            isPartnerA={myRole === "a"}
            round={round}
            onShare={onShareWhatsApp}
          />
        )}

        {/* Active turn — input or mirror */}
        {!isWaiting && (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            {isInputStage(stage) && (
              <InputBlock
                myName={myName ?? ""}
                otherName={otherName ?? ""}
                round={round}
                question={
                  round === 1
                    ? null
                    : myRole === "a"
                    ? round === 2 ? caseData.a_r2_question : caseData.a_r3_question
                    : round === 2 ? caseData.b_r2_question : caseData.b_r3_question
                }
                partnerMirror={
                  round === 2
                    ? myRole === "a" ? caseData.b_r1.mirror : caseData.a_r1.mirror
                    : null
                }
                text={text}
                setText={setText}
                busy={busy}
                onSubmit={onSubmit}
                error={error}
              />
            )}

            {isMirrorStage(stage) && (
              <MirrorBlock
                myName={myName ?? ""}
                mirror={currentMirror}
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
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WaitingScreen — shown while the other partner takes their turn
// Replaces the old HandoffCard. Polls automatically; this is just the UI.
// ─────────────────────────────────────────────────────────────────────────────
function WaitingScreen({
  otherName,
  isPartnerA,
  round,
  onShare,
}: {
  otherName: string;
  isPartnerA: boolean;
  round: number;
  onShare: () => void;
}) {
  return (
    <View style={wStyles.container} testID="waiting-screen">
      <BreathingCircle />

      <View style={wStyles.textBlock}>
        <Text style={wStyles.heading}>
          {"Waiting for\n"}
          <Text style={wStyles.headingName}>{otherName}</Text>
          {"..."}
        </Text>
        <Text style={wStyles.sub}>
          Take a breath. There&apos;s no rush here.
        </Text>
      </View>

      {/* Share button: Partner A only, round 1 only — B already joined, later
          rounds don't need a fresh invite. */}
      {isPartnerA && round === 1 && (
        <TouchableOpacity
          testID="share-whatsapp-button"
          onPress={onShare}
          activeOpacity={0.8}
          style={wStyles.shareBtn}
        >
          <Feather name="message-circle" size={16} color={theme.colors.charcoal} />
          <Text style={wStyles.shareBtnText}>Share with {otherName}</Text>
        </TouchableOpacity>
      )}

      <Text style={wStyles.note}>
        This screen will update automatically when it&apos;s your turn.
      </Text>
    </View>
  );
}

const wStyles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 0,
  },
  textBlock: {
    alignItems: "center",
    marginTop: 28,
    marginBottom: 28,
  },
  heading: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 24,
    lineHeight: 34,
    color: theme.colors.charcoal55,
    textAlign: "center",
  },
  headingName: {
    fontFamily: theme.fonts.serifMediumItalic,
    color: theme.colors.rose,
  },
  sub: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    color: theme.colors.charcoal40,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 24,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.charcoal18,
    borderRadius: theme.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  shareBtnText: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 14,
    color: theme.colors.charcoal,
  },
  note: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
    textAlign: "center",
    position: "absolute",
    bottom: 36,
    left: 28,
    right: 28,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// InputBlock — text / voice entry for each round
// ─────────────────────────────────────────────────────────────────────────────
function InputBlock({
  myName,
  otherName,
  round,
  question,
  partnerMirror,
  text,
  setText,
  busy,
  onSubmit,
  error,
}: {
  myName: string;
  otherName: string;
  round: 1 | 2 | 3;
  question: string | null;
  partnerMirror: string | null;
  text: string;
  setText: (s: string) => void;
  busy: boolean;
  onSubmit: () => void;
  error: string | null;
}) {
  const isReady = !busy && text.trim().length >= 4;

  return (
    <View style={iStyles.container}>
      <Text style={iStyles.h2}>
        {round === 1 ? `${myName} — your side` : `${myName}, your turn`}
      </Text>

      {round === 1 && (
        <Text style={iStyles.sub}>
          Describe what happened. Your partner won&apos;t see this until they share their side.
        </Text>
      )}

      {round === 2 && partnerMirror && (
        <View testID="partner-mirror-pullquote" style={iStyles.partnerCard}>
          <View style={iStyles.partnerAccent} />
          <Text style={iStyles.partnerLabel}>{otherName} felt</Text>
          <Text style={iStyles.partnerText}>&ldquo;{partnerMirror}&rdquo;</Text>
        </View>
      )}

      {(round === 2 || round === 3) && question && (
        <View style={iStyles.questionCard} testID="round-question-card">
          <Text style={iStyles.questionText}>{question}</Text>
        </View>
      )}

      {round === 3 && (
        <Text style={iStyles.finalNote}>Your last response before the verdict.</Text>
      )}

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

      <View style={iStyles.dividerRow}>
        <View style={iStyles.dividerLine} />
        <Text style={iStyles.dividerText}>or write it</Text>
        <View style={iStyles.dividerLine} />
      </View>

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
  container: { paddingBottom: 12 },
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.charcoal18 },
  dividerText: {
    fontFamily: theme.fonts.sans,
    fontSize: 12,
    color: theme.colors.charcoal40,
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
    minHeight: 130,
    ...theme.shadow.card,
  },
  submitBtn: {
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnRose: { backgroundColor: theme.colors.rose },
  submitBtnDisabled: { opacity: 0.45 },
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
  myName,
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
  myName: string;
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
              onTranscribed={(t) =>
                setAdjustText((prev) => (prev ? prev.trim() + " " + t : t))
              }
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
  container: { paddingBottom: 12 },
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
  adjustContainer: { marginTop: 8 },
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
  btnGroup: { gap: 10, marginTop: 20 },
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
  safe: { flex: 1, backgroundColor: theme.colors.cream },
  topBar: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { paddingVertical: 6, minWidth: 60 },
  backBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },
  dotsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.charcoal18,
  },
  dotActive: { backgroundColor: theme.colors.charcoal },
  topBarSpacer: { minWidth: 60 },
  scroll: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
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
