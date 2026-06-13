import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio";

import { theme } from "@/src/theme";
import { api } from "@/src/api";

type Props = {
  onTranscribed: (text: string) => void;
  size?: "small" | "large";
};

export function MicButton({ onTranscribed, size = "small" }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startTime = useRef<number>(0);

  const isLarge = size === "large";
  const dim = isLarge ? 72 : 44;
  const iconSize = isLarge ? 28 : 20;

  const start = async () => {
    setError(null);
    if (Platform.OS === "web") {
      setError("Voice recording isn't available on web — try the mobile app.");
      return;
    }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          setError("Microphone permission was denied. Open settings to enable.");
        } else {
          setError("Microphone permission is required.");
        }
        return;
      }
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startTime.current = Date.now();
      setIsRecording(true);
    } catch (e: any) {
      setError(e?.message || "Could not start recording.");
    }
  };

  const stop = async () => {
    try {
      setIsRecording(false);
      const elapsed = Date.now() - startTime.current;
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setError("No recording was captured.");
        return;
      }
      if (elapsed < 700) {
        setError("Hold longer to record your voice.");
        return;
      }
      setIsUploading(true);
      const filename = uri.split("/").pop() || "audio.m4a";
      const ext = filename.split(".").pop()?.toLowerCase() || "m4a";
      const mime = ext === "wav" ? "audio/wav" : ext === "mp3" ? "audio/mpeg" : "audio/m4a";
      const { text } = await api.transcribe(uri, mime, filename);
      if (text.trim().length > 0) {
        onTranscribed(text.trim());
      } else {
        setError("We couldn't hear anything. Try again.");
      }
    } catch (e: any) {
      setError(e?.message || "Could not transcribe audio.");
    } finally {
      setIsUploading(false);
    }
  };

  const onPress = () => {
    if (isUploading) return;
    if (isRecording) stop();
    else start();
  };

  const openSettings = () => {
    setError(null);
    Linking.openSettings();
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        testID="mic-button"
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isUploading}
        style={[
          styles.btn,
          { width: dim, height: dim, borderRadius: dim / 2 },
          isRecording && styles.btnRecording,
          isUploading && { opacity: 0.6 },
        ]}
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Feather
            name={isRecording ? "square" : "mic"}
            size={iconSize}
            color="#fff"
          />
        )}
      </TouchableOpacity>
      {isRecording && (
        <Text testID="mic-recording-label" style={styles.label}>
          Tap to stop
        </Text>
      )}
      {isUploading && (
        <Text testID="mic-uploading-label" style={styles.label}>
          Transcribing…
        </Text>
      )}
      {error && (
        <View>
          <Text testID="mic-error" style={styles.error}>
            {error}
          </Text>
          {error.toLowerCase().includes("settings") && (
            <TouchableOpacity onPress={openSettings} testID="mic-open-settings">
              <Text style={styles.settingsLink}>Open settings</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 6 },
  btn: {
    backgroundColor: theme.colors.rose,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRecording: { backgroundColor: theme.colors.charcoal },
  label: { fontSize: 12, color: theme.colors.textSubtle },
  error: { fontSize: 12, color: theme.colors.danger, textAlign: "center", maxWidth: 220 },
  settingsLink: {
    fontSize: 12,
    color: theme.colors.primary,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
});
