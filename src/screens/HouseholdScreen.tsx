import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { inviteMember } from "../api/sope";
import { useAuth } from "../auth/AuthContext";
import { colors, space } from "../theme";
import { GhostButton } from "../ui/controls";
import { TextField } from "../ui/fields";
import { Card, Row } from "../ui/list";
import { EmptyState, ErrorBanner, FormSheet, Screen, toErrorMessage, useFormDirty } from "../ui/primitives";

export function HouseholdScreen() {
  const auth = useAuth();
  const token = auth.token;
  const household = auth.me?.household;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const dirty = useFormDirty(formOpen, [email]);

  function closeInvite() {
    setFormOpen(false);
    setEmail("");
  }

  return (
    <Screen title="Hogar" actions={<GhostButton label="Invitar" onPress={() => setFormOpen(true)} />}>
      <ScrollView contentContainerStyle={styles.body}>
        <ErrorBanner error={error} />
        <Text style={styles.section}>Miembros</Text>
        {(household?.members ?? []).map((member) => (
          <Card key={member.userId}>
            <Row title={member.email} />
          </Card>
        ))}
        <Text style={styles.section}>Invitaciones pendientes</Text>
        {(household?.pendingInvites ?? []).length === 0 ? (
          <EmptyState text="No hay invitaciones pendientes." />
        ) : (
          (household?.pendingInvites ?? []).map((invite) => (
            <Card key={invite.email}>
              <Row title={invite.email} />
            </Card>
          ))
        )}
      </ScrollView>
      <FormSheet
        busy={busy}
        dirty={dirty}
        error={error}
        onClose={closeInvite}
        onSubmit={() => {
          if (token === undefined) {
            return;
          }
          setBusy(true);
          void inviteMember(token, email.trim())
            .then(async () => {
              setEmail("");
              setError(undefined);
              setFormOpen(false);
              await auth.reload();
            })
            .catch((cause: unknown) => setError(toErrorMessage(cause)))
            .finally(() => setBusy(false));
        }}
        submitLabel="Invitar"
        title="Invitar"
        visible={formOpen}
      >
        <TextField keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: space.lg,
    paddingBottom: 40,
    gap: space.md,
  },
  section: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
});
