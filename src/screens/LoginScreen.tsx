import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiRequestError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { apiBaseUrl } from "../config";
import { colors } from "../theme";

export function LoginScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      if (mode === "signup") {
        await auth.signup(email.trim(), password);
      } else {
        await auth.login(email.trim(), password);
      }
    } catch (cause: unknown) {
      if (cause instanceof ApiRequestError) {
        setError(cause.message);
      } else {
        setError("No se pudo conectar con el API. Revisá que esté corriendo y la URL.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>sope-control</Text>
        <Text style={styles.subtitle}>Finanzas del hogar</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="Contraseña"
          placeholderTextColor={colors.muted}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        {error !== undefined ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          disabled={busy || email.trim() === "" || password === ""}
          onPress={() => {
            void submit();
          }}
          style={[styles.button, busy ? styles.buttonDisabled : undefined]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(undefined);
          }}
        >
          <Text style={styles.switch}>
            {mode === "login" ? "¿No tenés cuenta? Crear una" : "¿Ya tenés cuenta? Iniciar sesión"}
          </Text>
        </Pressable>
        <Text style={styles.hint}>API: {apiBaseUrl}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  button: {
    backgroundColor: colors.teal,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  switch: {
    textAlign: "center",
    color: colors.teal,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  hint: {
    fontSize: 11,
    color: colors.muted,
  },
});
