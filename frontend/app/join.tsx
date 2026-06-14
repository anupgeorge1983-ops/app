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

import { theme } from "@/src/theme";
import { api } from "@/src/api";
import { Eyebrow } from "@/src/components/ui";

// Option A: the "code" Partner B enters is the full case UUID, sent by Partner A
// via the "Share via WhatsApp" message in the case flow.
//
// TODO (Option B — short code upgrade): once the backend exposes a short-code
// endpoint (e.g. GET /cases/by-code/:code) and the Case type gains a share_code
// field, replace the api.getCase(trimmed) call below with api.getCaseByCode(trimmed).
// The join screen UI, validation logic, and routing all stay identical — only the
// single API call changes.

export default function JoinScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter the case ID your partner shared with you.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Option A: full UUID lookup. Swap for getCaseByCode(trimmed) in Option B.
      const caseData = await api.getCase(trimmed);

      // Case is fully resolved — send to verdict
      if (caseData.stage === "verdict_ready") {
        router.replace(`/verdict/${caseData.id}`);
        return;
      }

      // It's Partner B's turn — enter the case flow
      if (caseData.stage.startsWith("b_")) {
        router.replace(`/case/${caseData.id}`);
        return;
      }

      // Partner A hasn't finished their side yet
      const aName = caseData.partner_a_name || "Your partner";
      setError(
        `${aName} is still on their side. They'll let you know when it's your turn.`
      );
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.includes("404") || msg.includes("not found")) {
        setError("No conversation found with that ID. Double-check and try again.");
      } else {
        setError("Couldn't connect. Check your internet and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity
            testID="join-back-button"
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <Eyebrow label="Be Heard" />

          <Text style={styles.h2}>
            Your partner wants{"\n"}to hear your side.
          </Text>
          <Text style={styles.sub}>
            Enter the case ID they shared with you to begin.
          </Text>

          {/* Code / ID input */}
          <TextInput
            testID="join-code-input"
            value={code}
            onChangeText={(t) => {
              setCode(t);
              if (error) setError(null);
            }}
            placeholder="Paste the case ID here"
            placeholderTextColor={theme.colors.charcoal40}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="go"
            onSubmitEditing={onJoin}
          />

          {error && (
            <Text testID="join-error" style={styles.error}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            testID="join-submit-button"
            onPress={onJoin}
            disabled={loading || code.trim().length === 0}
            activeOpacity={0.85}
            style={[
              styles.btnDark,
              (loading || code.trim().length === 0) && styles.btnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#F7F3EE" />
            ) : (
              <Text style={styles.btnDarkText}>Join conversation →</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.helpNote}>
            The case ID is in the message your partner sent you via WhatsApp.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.cream },

  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },

  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    marginBottom: 28,
  },
  backBtnText: {
    fontFamily: theme.fonts.sans,
    fontSize: 14,
    color: theme.colors.charcoal40,
  },

  h2: {
    fontFamily: theme.fonts.serifMedium,
    fontSize: 26,
    lineHeight: 34,
    color: theme.colors.charcoal,
    marginBottom: 12,
  },
  sub: {
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.charcoal55,
    marginBottom: 28,
  },

  // Large centred input — paste-friendly for long UUIDs
  input: {
    backgroundColor: theme.colors.offWhite,
    borderRadius: theme.radius.input,
    borderWidth: 1,
    borderColor: theme.colors.charcoal18,
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontFamily: theme.fonts.sans,
    fontSize: 15,
    color: theme.colors.charcoal,
    textAlign: "center",
    letterSpacing: 0.4,
    ...theme.shadow.card,
  },

  error: {
    fontFamily: theme.fonts.sans,
    color: theme.colors.rose,
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },

  btnDark: {
    backgroundColor: theme.colors.charcoal,
    borderRadius: theme.radius.button,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 20,
  },
  btnDarkText: {
    fontFamily: theme.fonts.sansMedium,
    color: "#F7F3EE",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnDisabled: { opacity: 0.4 },

  helpNote: {
    fontFamily: theme.fonts.sans,
    fontSize: 13,
    color: theme.colors.charcoal40,
    textAlign: "center",
    marginTop: 20,
    lineHeight: 20,
  },
});
