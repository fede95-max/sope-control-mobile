import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { assignMemberGroup, inviteMember, listGroups, removeMember } from "../api/sope";
import type { UserGroup } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { colors } from "../theme";
import { GhostButton } from "../ui/controls";
import { SelectField, TextField } from "../ui/fields";
import { Card, Row } from "../ui/list";
import {
  EmptyState,
  ErrorBanner,
  FormSheet,
  Screen,
  confirmAction,
  screenContentStyle,
  toErrorMessage,
  useFormDirty,
} from "../ui/primitives";

export function HouseholdScreen() {
  const auth = useAuth();
  const { can } = usePermissions();
  const canReadGroups = can("groups:read");
  const token = auth.token;
  const household = auth.me?.household;
  const currentUserId = auth.me?.user.id;
  const canRemoveMembers = household?.canRemoveMembers === true;
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [email, setEmail] = useState("");
  const [inviteGroupId, setInviteGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const dirty = useFormDirty(formOpen, [email, inviteGroupId]);

  useEffect(() => {
    if (token === undefined || !canReadGroups) {
      return;
    }
    void listGroups(token)
      .then((nextGroups) => {
        setGroups(nextGroups);
        const viewer = nextGroups.find((group) => group.seedCode === "VIEWER");
        setInviteGroupId(viewer?.id ?? nextGroups[0]?.id ?? "");
        setError(undefined);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)));
  }, [token, canReadGroups, household?.id]);

  function closeInvite() {
    setFormOpen(false);
    setEmail("");
  }

  function groupName(groupId: string | undefined): string {
    if (groupId === undefined) {
      return "Sin grupo";
    }
    return groups.find((group) => group.id === groupId)?.name ?? "Grupo";
  }

  function roleLabel(role: string | undefined): string {
    if (role === "OWNER") {
      return "Creador";
    }
    if (role === "INVITED") {
      return "Invitado";
    }
    return "";
  }

  const groupOptions = groups.map((group) => ({ value: group.id, label: group.name }));

  return (
    <Screen
      title="Hogar"
      actions={
        can("household:invite") ? <GhostButton label="Invitar" onPress={() => setFormOpen(true)} /> : undefined
      }
    >
      <ScrollView contentContainerStyle={screenContentStyle}>
        <ErrorBanner error={error} />
        <Text style={styles.section}>Miembros</Text>
        {(household?.members ?? []).map((member) => (
          <Card key={member.userId}>
            <Row
              subtitle={[roleLabel(member.role), canReadGroups ? groupName(member.groupId) : undefined]
                .filter((item) => item !== undefined && item !== "")
                .join(" · ")}
              title={member.email}
            />
            {can("household:manage-groups") && groups.length > 0 ? (
              <SelectField
                label="Grupo"
                onChange={(groupId) => {
                  if (token === undefined) {
                    return;
                  }
                  setBusy(true);
                  void assignMemberGroup(token, member.userId, groupId)
                    .then(async () => {
                      setError(undefined);
                      await auth.reload();
                    })
                    .catch((cause: unknown) => setError(toErrorMessage(cause)))
                    .finally(() => setBusy(false));
                }}
                options={groupOptions}
                value={member.groupId ?? ""}
              />
            ) : null}
            {canRemoveMembers && member.role === "INVITED" && member.userId !== currentUserId ? (
              <Pressable
                disabled={busy}
                onPress={() => {
                  if (token === undefined) {
                    return;
                  }
                  void confirmAction("Echar invitado", `¿Echar a ${member.email} de este hogar?`, "Echar").then(
                    (confirmed) => {
                      if (!confirmed) {
                        return;
                      }
                      setBusy(true);
                      void removeMember(token, member.userId)
                        .then(async () => {
                          setError(undefined);
                          await auth.reload();
                        })
                        .catch((cause: unknown) => setError(toErrorMessage(cause)))
                        .finally(() => setBusy(false));
                    },
                  );
                }}
              >
                <Text style={styles.remove}>Echar</Text>
              </Pressable>
            ) : null}
          </Card>
        ))}
        <Text style={styles.section}>Invitaciones pendientes</Text>
        {(household?.pendingInvites ?? []).length === 0 ? (
          <EmptyState text="No hay invitaciones pendientes." />
        ) : (
          (household?.pendingInvites ?? []).map((invite) => (
            <Card key={invite.email}>
              <Row subtitle={canReadGroups ? groupName(invite.groupId) : undefined} title={invite.email} />
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
          void inviteMember(token, email.trim(), inviteGroupId === "" ? undefined : inviteGroupId)
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
        <Text style={styles.hint}>
          Podés invitar un email aunque todavía no tenga cuenta. Si ya está registrado, se suma a este hogar y va a
          poder cambiar entre hogares.
        </Text>
        <TextField keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
        {groups.length > 0 ? (
          <SelectField
            label="Grupo"
            onChange={setInviteGroupId}
            options={groupOptions}
            value={inviteGroupId}
          />
        ) : null}
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  remove: {
    color: "#b91c1c",
    fontWeight: "700",
  },
});
