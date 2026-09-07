import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { listUsers, sendUserPushNotification } from "../api/sope";
import type { DirectoryUser } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme";
import { Chip, FilterRow, PrimaryButton, SearchBar, SortSelect } from "../ui/controls";
import { TextField } from "../ui/fields";
import { Card, Row } from "../ui/list";
import { EmptyState, ErrorBanner, FormSheet, Screen, matchesText, screenContentStyle, toErrorMessage } from "../ui/primitives";
import { compareNumber, compareText, useSortedItems, type SortOption } from "../ui/sort";

export function UsersScreen() {
  const auth = useAuth();
  const token = auth.token;
  const canNotify = auth.me?.permissions.includes("users:read") === true;
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [rootOnly, setRootOnly] = useState(false);
  const [sortId, setSortId] = useState("email-az");
  const [busy, setBusy] = useState(false);
  const [notifyUser, setNotifyUser] = useState<DirectoryUser | undefined>(undefined);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifyError, setNotifyError] = useState<string | undefined>(undefined);

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void listUsers(token)
      .then((nextUsers) => {
        setUsers(nextUsers);
        setError(undefined);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    reload();
  }, [token]);

  const filtered = useMemo(() => {
    return users.filter((user) => {
      if (rootOnly && !user.isRoot) {
        return false;
      }
      return matchesText(
        [
          user.email,
          user.isRoot ? "root" : "",
          ...user.memberships.flatMap((membership) => [membership.label, membership.groupName, membership.ownerEmail]),
        ],
        query,
      );
    });
  }, [users, query, rootOnly]);
  const sortOptions = useMemo(
    (): Array<SortOption<DirectoryUser>> => [
      { id: "email-az", label: "Email A-Z", compare: (a, b) => compareText(a.email, b.email) },
      {
        id: "households-desc",
        label: "Cant. hogares ↓",
        compare: (a, b) => compareNumber(b.memberships.length, a.memberships.length),
      },
    ],
    [],
  );
  const sorted = useSortedItems(filtered, sortId, sortOptions);
  const notifyDirty = notifyTitle.trim() !== "" || notifyBody.trim() !== "";

  function openNotify(user: DirectoryUser) {
    setNotifyUser(user);
    setNotifyTitle("");
    setNotifyBody("");
    setNotifyError(undefined);
  }

  function closeNotify() {
    setNotifyUser(undefined);
    setNotifyTitle("");
    setNotifyBody("");
    setNotifyError(undefined);
  }

  function submitNotify() {
    if (token === undefined || notifyUser === undefined) {
      return;
    }
    setBusy(true);
    void sendUserPushNotification(token, notifyUser.id, {
      title: notifyTitle.trim(),
      body: notifyBody.trim(),
    })
      .then((result) => {
        closeNotify();
        Alert.alert(
          "Notificación enviada",
          `Entregada a ${result.sent} dispositivo${result.sent === 1 ? "" : "s"}.`,
        );
      })
      .catch((cause: unknown) => setNotifyError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  return (
    <Screen title="Usuarios">
      <ScrollView
        contentContainerStyle={screenContentStyle}
        refreshControl={<RefreshControl onRefresh={reload} refreshing={busy} />}
      >
        <ErrorBanner error={error} />
        <Text style={styles.hint}>Todos los usuarios, con los hogares asociados y su grupo en cada uno.</Text>
        <SearchBar onChange={setQuery} value={query} />
        <FilterRow>
          <Chip active={rootOnly} label="Solo root" onPress={() => setRootOnly((current) => !current)} />
        </FilterRow>
        <SortSelect value={sortId} onChange={setSortId} options={sortOptions} />
        {sorted.length === 0 ? <EmptyState text="No hay usuarios." /> : null}
        {sorted.map((user) => (
          <Card key={user.id}>
            <Row
              right={
                canNotify ? (
                  <Pressable onPress={() => openNotify(user)} style={styles.notifyButton}>
                    <Text style={styles.notifyText}>Notificar</Text>
                  </Pressable>
                ) : undefined
              }
              subtitle={user.isRoot ? "Root" : undefined}
              title={user.email}
            />
            {user.memberships.map((membership) => (
              <Card
                key={membership.householdId}
                onPress={
                  membership.householdId === auth.me?.user.householdId
                    ? undefined
                    : () => {
                        setBusy(true);
                        void auth
                          .switchHousehold(membership.householdId)
                          .then(() => setError(undefined))
                          .catch((cause: unknown) => setError(toErrorMessage(cause)))
                          .finally(() => setBusy(false));
                      }
                }
              >
                <Row
                  meta={membership.householdId === auth.me?.user.householdId ? "Abierto" : "Abrir"}
                  subtitle={`${membership.role === "OWNER" ? "Creador" : "Invitado"}${
                    membership.groupName === undefined ? "" : ` · ${membership.groupName}`
                  }`}
                  title={membership.label}
                />
              </Card>
            ))}
          </Card>
        ))}
      </ScrollView>
      <FormSheet
        busy={busy}
        dirty={notifyDirty}
        error={notifyError}
        onClose={closeNotify}
        onSubmit={submitNotify}
        submitLabel="Enviar"
        title={notifyUser === undefined ? "Notificar" : `Notificar a ${notifyUser.email}`}
        visible={notifyUser !== undefined}
      >
        <Text style={styles.hint}>Solo usuarios root pueden enviar notificaciones push.</Text>
        <TextField label="Título" onChangeText={setNotifyTitle} value={notifyTitle} />
        <TextField label="Mensaje" onChangeText={setNotifyBody} value={notifyBody} />
        <PrimaryButton disabled={busy} label="Enviar" onPress={submitNotify} />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  notifyButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.teal,
  },
  notifyText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
