import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { theme } from "@/src/theme";
import { api, Profile } from "@/src/api";
import { getOrCreateUserId, resetSession, getUserNames } from "@/src/session";

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [names, setNames] = useState<{ name: string; partner: string }>({ name: "", partner: "" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const uid = await getOrCreateUserId();
    const local = await getUserNames();
    setNames(local);
    try {
      const p = await api.getProfile(uid);
      setProfile(p);
    } catch {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reset = async () => {
    await resetSession();
    router.replace("/onboarding");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          testID="profile-back-button"
          onPress={() => router.back()}
          style={{ width: 40, height: 40, justifyContent: "center" }}
        >
          <Feather name="arrow-left" size={22} color={theme.colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(names.name || profile?.name || "Y").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name} testID="profile-name">
            {names.name || profile?.name || "You"}
          </Text>
          <Text style={styles.partner}>
            with <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
              {names.partner || profile?.partner_name || "Partner"}
            </Text>
          </Text>

          {/* Quick access — past cases & stats */}
          <View style={styles.linksBlock}>
            <TouchableOpacity
              testID="profile-past-cases-button"
              onPress={() => router.push("/cases")}
              activeOpacity={0.85}
              style={styles.linkRow}
            >
              <View style={styles.linkIcon}>
                <Feather name="archive" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Past cases</Text>
                <Text style={styles.linkSub}>Review your history</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textSubtle} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="profile-stats-button"
              onPress={() => router.push("/stats")}
              activeOpacity={0.85}
              style={styles.linkRow}
            >
              <View style={styles.linkIcon}>
                <Feather name="bar-chart-2" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle}>Your stats</Text>
                <Text style={styles.linkSub}>Personal and community totals</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.colors.textSubtle} />
            </TouchableOpacity>
          </View>

          {profile?.answers && profile.answers.length > 0 && (
            <View style={{ marginTop: theme.spacing.xl }}>
              <Text style={styles.section}>YOUR CONFLICT STYLE</Text>
              {profile.answers.map((a, idx) => (
                <View key={idx} style={styles.answerCard}>
                  <Text style={styles.q}>{a.question}</Text>
                  <Text style={styles.a}>{a.answer}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            testID="reset-session-button"
            onPress={reset}
            activeOpacity={0.85}
            style={styles.resetBtn}
          >
            <Feather name="refresh-cw" size={16} color={theme.colors.danger} />
            <Text style={styles.resetText}>Reset onboarding</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
    paddingVertical: theme.spacing.sm,
  },
  title: { fontSize: 17, fontWeight: "600", color: theme.colors.textHeading },
  scroll: { padding: theme.spacing.lg, alignItems: "stretch" },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryTint,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: theme.spacing.md,
  },
  avatarInitial: { fontSize: 32, fontWeight: "700", color: theme.colors.primary },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textHeading,
    textAlign: "center",
    marginTop: theme.spacing.md,
  },
  partner: { fontSize: 14, color: theme.colors.textBody, textAlign: "center", marginTop: 4 },
  linksBlock: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: { fontSize: 15, fontWeight: "600", color: theme.colors.textHeading },
  linkSub: { fontSize: 13, color: theme.colors.textSubtle, marginTop: 2 },
  section: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: theme.colors.textSubtle,
    marginBottom: theme.spacing.md,
  },
  answerCard: {
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  q: { fontSize: 13, color: theme.colors.textSubtle, marginBottom: 4 },
  a: { fontSize: 15, color: theme.colors.textHeading, fontWeight: "500" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xxl,
    padding: theme.spacing.md,
  },
  resetText: { color: theme.colors.danger, fontSize: 14, fontWeight: "600" },
});
