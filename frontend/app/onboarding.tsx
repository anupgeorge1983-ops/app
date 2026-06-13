import { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { theme } from "@/src/theme";
import { api } from "@/src/api";
import { getOrCreateUserId, setOnboarded } from "@/src/session";
import { Eyebrow } from "@/src/components/ui";

type Mode = "quick" | "full";

const QUICK_QUESTIONS = [
  {
    q: "When something upsets you, what do you usually do?",
    options: ["I go quiet and need space", "I need to talk it out immediately"],
  },
  {
    q: "When a conflict is unresolved, how does it affect you?",
    options: [
      "I can't move on until it's resolved",
      "I need time before I can address it",
    ],
  },
  {
    q: "What do you need most during a conflict?",
    options: [
      "To feel heard and understood",
      "Space to process before responding",
    ],
  },
];

const FULL_QUESTIONS = [
  ...QUICK_QUESTIONS,
  {
    q: "When you feel hurt, what's your first instinct?",
    options: ["Withdraw and protect myself", "Express it directly"],
  },
  {
    q: "How do you usually start a difficult conversation?",
    options: ["With facts and what happened", "With how I felt"],
  },
  {
    q: "When your partner is upset, you tend to:",
    options: ["Try to fix it right away", "Listen first, then respond"],
  },
  {
    q: "How do you receive feedback?",
    options: ["I take it personally at first", "I try to understand the intent"],
  },
  {
    q: "After a fight, you usually want to:",
    options: ["Be alone for a while", "Reconnect quickly"],
  },
  {
    q: "What hurts you the most in a conflict?",
    options: ["Feeling dismissed", "Feeling blamed"],
  },
  {
    q: "How do you express affection most often?",
    options: ["Words and conversation", "Acts and gestures"],
  },
  {
    q: "When you're stressed, your partner should:",
    options: ["Give you room", "Stay close and check in"],
  },
  {
    q: "How important is being 'right' during an argument?",
    options: ["Important — I need to be understood", "Not important — I want to resolve it"],
  },
  {
    q: "What helps you calm down fastest?",
    options: ["Time alone", "A reassuring conversation"],
  },
  {
    q: "How do you usually apologize?",
    options: ["Briefly and move on", "By owning specifics"],
  },
  {
    q: "What do you wish your partner did more often?",
    options: ["Listen without fixing", "Initiate the repair"],
  },
];

type Step = "welcome" | "names" | "questions" | "done";

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [mode, setMode] = useState<Mode>("quick");
  const [name, setName] = useState("");
  const [partner, setPartner] = useState("");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const questions = mode === "quick" ? QUICK_QUESTIONS : FULL_QUESTIONS;

  const selectAnswer = (answer: string) => {
    const current = questions[qIndex];
    const next = [...answers];
    next[qIndex] = { question: current.q, answer };
    setAnswers(next);
    setTimeout(() => {
      if (qIndex < questions.length - 1) {
        setQIndex(qIndex + 1);
      } else {
        save(next);
      }
    }, 220);
  };

  const save = async (finalAnswers: typeof answers) => {
    setSaving(true);
    try {
      const uid = await getOrCreateUserId();
      await api.upsertProfile({
        user_id: uid,
        name: name.trim() || "You",
        partner_name: partner.trim() || "Partner",
        mode,
        answers: finalAnswers,
      });
      await setOnboarded(name.trim() || "You", partner.trim() || "Partner");
      setStep("done");
    } catch (e) {
      console.warn("save profile failed", e);
      await setOnboarded(name.trim() || "You", partner.trim() || "Partner");
      setStep("done");
    } finally {
      setSaving(false);
    }
  };

  // ── WELCOME ───────────────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Eyebrow label="Be Heard" />

          <Text style={styles.h1}>Welcome.</Text>
          <Text style={styles.sub}>
            Let&apos;s get to know you before we start.
          </Text>

          <View style={styles.modeGroup}>
            <TouchableOpacity
              testID="mode-quick-card"
              onPress={() => setMode("quick")}
              activeOpacity={0.85}
              style={[styles.modeCard, mode === "quick" && styles.modeCardSel]}
            >
              <View style={[styles.modeIcon, mode === "quick" && styles.modeIconSel]}>
                <Feather
                  name="zap"
                  size={20}
                  color={mode === "quick" ? "#fff" : theme.colors.rose}
                />
              </View>
              <View style={styles.modeText}>
                <Text style={[styles.modeTitle, mode === "quick" && styles.modeTitleSel]}>
                  Quick start
                </Text>
                <Text style={styles.modeSub}>3 questions, get started immediately</Text>
              </View>
              {mode === "quick" && (
                <Feather name="check" size={18} color={theme.colors.rose} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              testID="mode-full-card"
              onPress={() => setMode("full")}
              activeOpacity={0.85}
              style={[styles.modeCard, mode === "full" && styles.modeCardSel]}
            >
              <View style={[styles.modeIcon, mode === "full" && styles.modeIconSel]}>
                <Feather
                  name="user"
                  size={20}
                  color={mode === "full" ? "#fff" : theme.colors.rose}
                />
              </View>
              <View style={styles.modeText}>
                <Text style={[styles.modeTitle, mode === "full" && styles.modeTitleSel]}>
                  Full profile
                </Text>
                <Text style={styles.modeSub}>15 questions for richer personalisation</Text>
              </View>
              {mode === "full" && (
                <Feather name="check" size={18} color={theme.colors.rose} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="onboarding-continue-button"
            style={styles.btnDark}
            onPress={() => setStep("names")}
            activeOpacity={0.85}
          >
            <Text style={styles.btnDarkText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── NAMES ─────────────────────────────────────────────────────────────────
  if (step === "names") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <BackBar onBack={() => setStep("welcome")} />

            <Text style={styles.h1}>What should we{"\n"}call you?</Text>
            <Text style={styles.sub}>Just first names. You can change these later.</Text>

            <View style={styles.fieldsGroup}>
              <View>
                <Text style={styles.fieldLabel}>Your name</Text>
                <TextInput
                  testID="onboarding-name-input"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Alex"
                  placeholderTextColor={theme.colors.charcoal40}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Your partner&apos;s name</Text>
                <TextInput
                  testID="onboarding-partner-input"
                  value={partner}
                  onChangeText={setPartner}
                  placeholder="e.g. Sam"
                  placeholderTextColor={theme.colors.charcoal40}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <TouchableOpacity
              testID="names-continue-button"
              disabled={name.trim().length === 0}
              onPress={() => setStep("questions")}
              activeOpacity={0.85}
              style={[styles.btnDark, name.trim().length === 0 && styles.btnDisabled]}
            >
              <Text style={styles.btnDarkText}>Next</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── QUESTIONS ─────────────────────────────────────────────────────────────
  if (step === "questions") {
    const current = questions[qIndex];
    const selected = answers[qIndex]?.answer;
    const progress = ((qIndex + 1) / questions.length) * 100;

    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <BackBar
            onBack={() => {
              if (qIndex === 0) setStep("names");
              else setQIndex(qIndex - 1);
            }}
          />

          {/* Progress */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>
            {qIndex + 1} of {questions.length}
          </Text>

          <Text style={styles.h2}>{current.q}</Text>

          <View style={styles.optionsGroup}>
            {current.options.map((opt) => {
              const isSel = selected === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  testID={`question-${qIndex}-option-${opt.slice(0, 12).replace(/\s+/g, "-").toLowerCase()}`}
                  onPress={() => selectAnswer(opt)}
                  activeOpacity={0.85}
                  style={[styles.optionCard, isSel && styles.optionCardSel]}
                >
                  <Text style={[styles.optionText, isSel && styles.optionTextSel]}>
                    {opt}
                  </Text>
                  {isSel && (
                    <Feather name="check" size={18} color={theme.colors.rose} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {saving && (
            <ActivityIndicator color={theme.colors.rose} style={{ marginTop: 24 }} />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.doneWrap}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={32} color="#fff" />
        </View>
        <Text style={[styles.h1, styles.centerText]}>You&apos;re all set.</Text>
        <Text style={[styles.sub, styles.centerText, { maxWidth: 280 }]}>
          Be Heard will personalise your experience as you go.
        </Text>
        <TouchableOpacity
          testID="onboarding-done-button"
          style={[styles.btnDark, { marginTop: 40, width: "100%" }]}
          onPress={() => router.replace("/")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnDarkText}>Start using Be Heard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Local BackBar keeps existing testID ──────────────────────────────────────
function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <TouchableOpacity
      testID="back-button"
      onPress={onBack}
      style={styles.backBtn}
      activeOpacity={0.7}
    >
      <Text style={styles.backBtnText}>← Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.cream },

  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },

  // Back button
  backBtn: { alignSelf: "flex-start", paddingVertical: 6, marginBottom: 28 },
  backBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },

  // Typography
  h1: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 30,
    lineHeight: 38,
    color: theme.colors.charcoal,
    marginBottom: 10,
  },
  h2: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 22,
    lineHeight: 32,
    color: theme.colors.charcoal,
    marginTop: 20,
    marginBottom: 4,
  },
  sub: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.charcoal55,
    marginBottom: 4,
  },
  centerText: { textAlign: "center" },

  // Mode cards
  modeGroup: { gap: 12, marginTop: 28, marginBottom: 4 },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.colors.charcoal18,
    backgroundColor: theme.colors.surface,
    gap: 14,
  },
  modeCardSel: {
    borderColor: theme.colors.rose,
    backgroundColor: theme.colors.roseSoft,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.roseSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  modeIconSel: { backgroundColor: theme.colors.rose },
  modeText: { flex: 1 },
  modeTitle: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 16,
    color: theme.colors.charcoal,
  },
  modeTitleSel: { color: theme.colors.rose },
  modeSub: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.charcoal55,
    marginTop: 2,
  },

  // Name fields
  fieldsGroup: { gap: 16, marginTop: 28, marginBottom: 4 },
  fieldLabel: {
    fontFamily: theme.fonts.sansMedium,
    fontSize: 13,
    color: theme.colors.charcoal55,
    marginBottom: 7,
  },
  input: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.charcoal18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: theme.fonts.sans,
    fontSize: 16,
    color: theme.colors.charcoal,
  },

  // Progress bar
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.charcoal18,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.charcoal,
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: theme.fonts.sans,
    fontSize: 11,
    color: theme.colors.charcoal40,
  },

  // Option cards
  optionsGroup: { gap: 10, marginTop: 20 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.colors.charcoal18,
    backgroundColor: theme.colors.surface,
  },
  optionCardSel: {
    borderColor: theme.colors.rose,
    backgroundColor: theme.colors.roseSoft,
  },
  optionText: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    color: theme.colors.charcoal,
    flex: 1,
    lineHeight: 22,
  },
  optionTextSel: {
    fontFamily: theme.fonts.sansMedium,
    color: theme.colors.charcoal,
  },

  // Done screen
  doneWrap: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.rose,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  // Buttons
  btnDark: {
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 28,
  },
  btnDarkText: {
    fontFamily: theme.fonts.sansMedium,
    color: "#F7F3EE",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnDisabled: { opacity: 0.4 },
});
