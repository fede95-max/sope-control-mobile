import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiRequestError } from "../api/client";
import { colors, space } from "../theme";

export function toErrorMessage(cause: unknown): string {
  if (cause instanceof ApiRequestError || cause instanceof Error) {
    return cause.message;
  }
  return "Ocurrió un error";
}

export function matchesText(parts: Array<string | number | undefined>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return true;
  }
  return parts.some((part) => String(part ?? "").toLowerCase().includes(needle));
}

export function useFormDirty(open: boolean, values: unknown[]): boolean {
  const snapshotRef = useRef("");
  const serialized = JSON.stringify(values);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) {
      snapshotRef.current = "";
      setDirty(false);
      return;
    }
    snapshotRef.current = serialized;
    setDirty(false);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDirty(serialized !== snapshotRef.current);
  }, [open, serialized]);

  return dirty;
}

export function confirmAction(title: string, message: string, confirmLabel: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export function ErrorBanner({ error }: { error: string | undefined }) {
  if (error === undefined) {
    return null;
  }
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
}

export const screenContentStyle = {
  paddingHorizontal: space.lg,
  paddingBottom: space.lg + space.md,
  gap: space.md,
} as const;

export function Screen({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        {canGoBack ? (
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {actions}
      </View>
      {children}
    </SafeAreaView>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

export function StatusPill({ pending }: { pending: boolean }) {
  return (
    <View style={[styles.pill, pending ? styles.pillPending : styles.pillApproved]}>
      <Text style={[styles.pillText, pending ? styles.pillPendingText : styles.pillApprovedText]}>
        {pending ? "Pendiente" : "Aprobado"}
      </Text>
    </View>
  );
}

export function FormSheet({
  visible,
  title,
  submitLabel,
  busy,
  dirty,
  error,
  onClose,
  onSubmit,
  onDelete,
  children,
}: {
  visible: boolean;
  title: string;
  submitLabel: string;
  busy: boolean;
  dirty: boolean;
  error?: string | undefined;
  onClose: () => void;
  onSubmit: () => void;
  onDelete?: (() => void) | undefined;
  children: ReactNode;
}) {
  function requestClose() {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert("Cambios sin guardar", "¿Querés salir?", [
      { text: "Seguir editando", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: onClose },
    ]);
  }

  return (
    <Modal animationType="slide" onRequestClose={requestClose} visible={visible}>
      <SafeAreaView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Pressable disabled={busy} onPress={requestClose}>
            <Text style={styles.sheetLink}>Cerrar</Text>
          </Pressable>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable disabled={busy} onPress={onSubmit}>
            {busy ? <ActivityIndicator color={colors.teal} /> : <Text style={styles.sheetLinkStrong}>{submitLabel}</Text>}
          </Pressable>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <ErrorBanner error={error} />
            {children}
            {onDelete !== undefined ? (
              <Pressable disabled={busy} onPress={onDelete} style={styles.deleteButton}>
                <Text style={styles.deleteText}>Eliminar</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    flex: 1,
  },
  back: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  backText: {
    fontSize: 32,
    lineHeight: 32,
    color: colors.teal,
    fontWeight: "300",
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: space.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    paddingVertical: space.lg,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillPending: {
    backgroundColor: colors.pendingSoft,
  },
  pillApproved: {
    backgroundColor: colors.approvedSoft,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  pillPendingText: {
    color: colors.pending,
  },
  pillApprovedText: {
    color: colors.approved,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  sheetLink: {
    color: colors.muted,
    fontSize: 16,
    minWidth: 72,
  },
  sheetLinkStrong: {
    color: colors.teal,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
    minWidth: 72,
  },
  flex: {
    flex: 1,
  },
  sheetBody: {
    padding: space.lg,
    gap: space.md,
  },
  deleteButton: {
    marginTop: space.sm,
    alignItems: "center",
    paddingVertical: 14,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: "600",
  },
});
