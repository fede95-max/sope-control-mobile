import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { listAccounts, listCards, listMassImports } from "../api/sope";
import type { Account, Card, MassImport } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import type { MoreStackParamList } from "../navigation/types";
import { formatCalendarDate } from "../money";
import { Chip, CollapsibleFilters, FilterRow, GhostButton, SearchBar, SortSelect } from "../ui/controls";
import { Card as ListCard, Row } from "../ui/list";
import { formatMassImportRecordTotals } from "../ui/listTotals";
import { EmptyState, ErrorBanner, Screen, matchesText, screenContentStyle, toErrorMessage } from "../ui/primitives";
import { compareNumber, compareText, useSortedItems, type SortOption } from "../ui/sort";

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
  const { can } = usePermissions();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const [items, setItems] = useState<MassImport[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [statusFilter, setStatusFilter] = useState("DRAFT");
  const [sortId, setSortId] = useState("date-desc");

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
    return items.filter((item) => {
      if (statusFilter !== "") {
        if (item.status !== statusFilter) {
          return false;
        }
      } else if (!showCancelled && item.status === "CANCELLED") {
        return false;
      }
      return matchesText(
        [statusLabel(item.status), targetLabel(item, accounts, cards), formatCalendarDate(item.createdAt.slice(0, 10))],
        query,
      );
    });
  }, [items, accounts, cards, query, showCancelled, statusFilter]);
  const sortOptions = useMemo(
    (): Array<SortOption<MassImport>> => [
      { id: "date-desc", label: "Fecha ↓", compare: (a, b) => compareText(b.createdAt, a.createdAt) },
      { id: "status", label: "Estado", compare: (a, b) => compareText(statusLabel(a.status), statusLabel(b.status)) },
      { id: "detected-desc", label: "Detectados ↓", compare: (a, b) => compareNumber(b.detectedCount, a.detectedCount) },
      {
        id: "confirmed-desc",
        label: "Confirmados ↓",
        compare: (a, b) => compareNumber(b.confirmedCount ?? 0, a.confirmedCount ?? 0),
      },
    ],
    [],
  );
  const sorted = useSortedItems(filtered, sortId, sortOptions);

  return (
    <Screen title="Movimientos masivos" actions={can("mass-imports:write") ? <GhostButton label="Nuevo" onPress={() => navigation.navigate("MassImportNew")} /> : undefined}>
      <ScrollView
        contentContainerStyle={screenContentStyle}
        refreshControl={<RefreshControl onRefresh={reload} refreshing={busy} />}
      >
        <SearchBar onChange={setQuery} value={query} />
        <CollapsibleFilters activeCount={(statusFilter === "" ? 0 : 1) + (showCancelled ? 1 : 0)}>
          <FilterRow>
            <Chip active={statusFilter === ""} label="Todos" onPress={() => setStatusFilter("")} />
            <Chip active={statusFilter === "DRAFT"} label="Borrador" onPress={() => setStatusFilter("DRAFT")} />
            <Chip active={statusFilter === "CONFIRMED"} label="Confirmado" onPress={() => setStatusFilter("CONFIRMED")} />
            <Chip active={statusFilter === "CANCELLED"} label="Cancelado" onPress={() => setStatusFilter("CANCELLED")} />
            <Chip
              active={showCancelled}
              label="Mostrar cancelados"
              onPress={() => setShowCancelled((current) => !current)}
            />
          </FilterRow>
        </CollapsibleFilters>
        <SortSelect value={sortId} onChange={setSortId} options={sortOptions} />
        <ErrorBanner error={error} />
        {sorted.length === 0 ? (
          <EmptyState text="No hay movimientos masivos." />
        ) : (
          sorted.map((item) => (
            <ListCard key={item.id} onPress={() => navigation.navigate("MassImportReview", { id: item.id })}>
              <Row
                meta={`${item.fileCount} archivos · ${formatMassImportRecordTotals(item)}`}
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
