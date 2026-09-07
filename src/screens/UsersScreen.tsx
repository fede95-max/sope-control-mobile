import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { listUsers } from "../api/sope";
import type { DirectoryUser } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme";
import { Chip, FilterRow, SearchBar, SortSelect } from "../ui/controls";
import { Card, Row } from "../ui/list";
import { EmptyState, ErrorBanner, Screen, matchesText, screenContentStyle, toErrorMessage } from "../ui/primitives";
import { compareNumber, compareText, useSortedItems, type SortOption } from "../ui/sort";

export function UsersScreen() {
  const auth = useAuth();
  const token = auth.token;
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [rootOnly, setRootOnly] = useState(false);
  const [sortId, setSortId] = useState("email-az");
  const [busy, setBusy] = useState(false);

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
