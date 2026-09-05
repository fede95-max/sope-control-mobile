import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { listAccounts, listCards, listMassImports } from "../api/sope";
import type { Account, Card, MassImport } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import type { MoreStackParamList } from "../navigation/types";
import { formatCalendarDate } from "../money";
import { GhostButton, SearchBar } from "../ui/controls";
import { Card as ListCard, Row } from "../ui/list";
import { EmptyState, ErrorBanner, Screen, matchesText, screenContentStyle, toErrorMessage } from "../ui/primitives";

function statusLabel(status: MassImport["status"]): string {
  if (status === "DRAFT") {
    return "Borrador";
  }
  if (status === "CONFIRMED") {
    return "Confirmado";
  }
  if (status === "CANCELLED") {
    return "Cancelado";
  }
  return "Descartado";
}

function targetLabel(item: MassImport, accounts: Account[], cards: Card[]): string {
  if (item.cardId !== undefined) {
    return cards.find((card) => card.id === item.cardId)?.name ?? "Tarjeta";
  }
  return accounts.find((account) => account.id === item.accountId)?.name ?? "Cuenta";
}

export function MassImportsScreen() {
  const token = useAuth().token;
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const [items, setItems] = useState<MassImport[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void Promise.all([listMassImports(token), listAccounts(token, true), listCards(token, true)])
      .then(([nextItems, nextAccounts, nextCards]) => {
        setItems(nextItems);
        setAccounts(nextAccounts);
        setCards(nextCards);
        setError(undefined);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    reload();
  }, [token]);

  const filtered = useMemo(() => {
    return items.filter((item) =>
      matchesText(
        [statusLabel(item.status), targetLabel(item, accounts, cards), formatCalendarDate(item.createdAt.slice(0, 10))],
        query,
      ),
    );
  }, [items, accounts, cards, query]);

  return (
    <Screen title="Movimientos masivos" actions={<GhostButton label="Nuevo" onPress={() => navigation.navigate("MassImportNew")} />}>
      <ScrollView
        contentContainerStyle={screenContentStyle}
        refreshControl={<RefreshControl onRefresh={reload} refreshing={busy} />}
      >
        <SearchBar onChange={setQuery} value={query} />
        <ErrorBanner error={error} />
        {filtered.length === 0 ? (
          <EmptyState text="No hay movimientos masivos." />
        ) : (
          filtered.map((item) => (
            <ListCard key={item.id} onPress={() => navigation.navigate("MassImportReview", { id: item.id })}>
              <Row
                meta={`${item.fileCount} archivos · ${item.detectedCount} detectados`}
                subtitle={`${formatCalendarDate(item.createdAt.slice(0, 10))} · ${statusLabel(item.status)}`}
                title={targetLabel(item, accounts, cards)}
              />
            </ListCard>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
