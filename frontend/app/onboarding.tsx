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
      // still allow proceeding so demo isn't blocked
      await setOnboarded(name.trim() || "You", partner.trim() || "Partner");
      setStep("done");
    } finally {
      setSaving(false);
    }
  };

  // ---------- WELCOME ----------
  if (step === "welcome") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.brand}>Be Heard</Text>
          <Text style={styles.h1}>Welcome to Be Heard</Text>
          <Text style={styles.sub}>Let&apos;s get to know you before we start.</Text>

          <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
            <TouchableOpacity
              testID="mode-quick-card"
              onPress={() => setMode("quick")}
              activeOpacity={0.85}
              style={[styles.modeCard, mode === "quick" && styles.modeCardSelected]}
            >
              <View
                style={[
                  styles.modeIconWrap,
                  mode === "quick" && { backgroundColor: theme.colors.primary },
                ]}
              >
                <Feather
                  name="zap"
                  size={20}
                  color={mode === "quick" ? "#fff" : theme.colors.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <Text style={styles.modeTitle}>Quick start</Text>
                <Text style={styles.modeSub}>3 questions, get started immediately</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              testID="mode-full-card"
              onPress={() => setMode("full")}
              activeOpacity={0.85}
              style={[styles.modeCard, mode === "full" && styles.modeCardSelected]}
            >
              <View
                style={[
                  styles.modeIconWrap,
                  mode === "full" && { backgroundColor: theme.colors.primary },
                ]}
              >
                <Feather
                  name="user"
                  size={20}
                  color={mode === "full" ? "#fff" : theme.colors.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <Text style={styles.modeTitle}>Full profile</Text>
                <Text style={styles.modeSub}>15 questions for richer personalisation</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="onboarding-continue-button"
            style={styles.primaryBtn}
            onPress={() => setStep("names")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- NAMES ----------
  if (step === "names") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <BackBar onBack={() => setStep("welcome")} />
            <Text style={styles.h1}>What should we call you?</Text>
            <Text style={styles.sub}>Just first names. You can change these later.</Text>

            <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                testID="onboarding-name-input"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Alex"
                placeholderTextColor={theme.colors.textSubtle}
                style={styles.input}
                autoCapitalize="words"
              />
              <Text style={[styles.label, { marginTop: theme.spacing.md }]}>
                Your partner&apos;s name
              </Text>
              <TextInput
                testID="onboarding-partner-input"
                value={partner}
                onChangeText={setPartner}
                placeholder="e.g. Sam"
                placeholderTextColor={theme.colors.textSubtle}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity
              testID="names-continue-button"
              disabled={name.trim().length === 0}
              onPress={() => setStep("questions")}
              activeOpacity={0.85}
              style={[
                styles.primaryBtn,
                name.trim().length === 0 && styles.primaryBtnDisabled,
              ]}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---------- QUESTIONS ----------
  if (step === "questions") {
    const current = questions[qIndex];
    const selected = answers[qIndex]?.answer;
    const progress = ((qIndex + 1) / questions.length) * 100;

    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <BackBar
            onBack={() => {
              if (qIndex === 0) setStep("names");
              else setQIndex(qIndex - 1);
            }}
          />

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {qIndex + 1} of {questions.length}
          </Text>

          <Text style={styles.h2}>{current.q}</Text>

          <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
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
                  <Text style={[styles.optionText, isSel && styles.optionTextSel]}>{opt}</Text>
                  {isSel && <Feather name="check" size={18} color={theme.colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {saving && (
            <ActivityIndicator
              color={theme.colors.primary}
              style={{ marginTop: theme.spacing.lg }}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------- DONE ----------
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={[styles.container, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
        <View style={styles.checkCircle}>
          <Feather name="check" size={36} color="#fff" />
        </View>
        <Text style={[styles.h1, { textAlign: "center", marginTop: theme.spacing.xl }]}>
          You&apos;re all set
        </Text>
        <Text style={[styles.sub, { textAlign: "center", marginTop: theme.spacing.sm, maxWidth: 280 }]}>
          Be Heard will personalise your experience as you go.
        </Text>
        <TouchableOpacity
          testID="onboarding-done-button"
          style={[styles.primaryBtn, { width: "100%", marginTop: theme.spacing.xxl }]}
          onPress={() => router.replace("/")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Start using Be Heard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <TouchableOpacity
      testID="back-button"
      onPress={onBack}
      style={{ width: 40, height: 40, justifyContent: "center" }}
      activeOpacity={0.7}
    >
      <Feather name="arrow-left" size={22} color={theme.colors.textHeading} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  brand: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: theme.spacing.lg,
  },
  h1: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.textHeading,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textHeading,
    marginTop: theme.spacing.lg,
    lineHeight: 30,
  },
  sub: {
    fontSize: 15,
    color: theme.colors.textBody,
    marginTop: theme.spacing.sm,
    lineHeight: 22,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  modeCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryTint,
  },
  modeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.textHeading,
  },
  modeSub: {
    fontSize: 13,
    color: theme.colors.textBody,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: theme.spacing.xl,
  },
  primaryBtnDisabled: { backgroundColor: theme.colors.textSubtle, opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  label: { fontSize: 13, color: theme.colors.textBody, fontWeight: "600" },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.textHeading,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.borderSoft,
    overflow: "hidden",
    marginTop: theme.spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: theme.colors.textSubtle,
    marginTop: theme.spacing.sm,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.lg,
    borderRadius: theme.radius.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionCardSel: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryTint,
  },
  optionText: { fontSize: 16, color: theme.colors.textHeading, flex: 1 },
  optionTextSel: { color: theme.colors.primary, fontWeight: "600" },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
