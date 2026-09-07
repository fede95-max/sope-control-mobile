import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { getDashboard, listBudgets, listCategories, shareMonthExcel } from "../api/sope";
import type { Budget, Category, Dashboard } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { currentYearMonth, formatAmountFromMinor } from "../money";
import { colors, space } from "../theme";
import { CategoryChip } from "../ui/CategoryChip";
import { Chip, FilterRow, GhostButton, MonthStepper, SearchBar, SortSelect } from "../ui/controls";
import { Card, Row, Amount } from "../ui/list";
import { EmptyState, ErrorBanner, Screen, matchesText, screenContentStyle, toErrorMessage } from "../ui/primitives";
import { compareNumber, compareText, useSortedItems, type SortOption } from "../ui/sort";

export function DashboardScreen() {
  const auth = useAuth();
  const { can } = usePermissions();
  const canReadBudgets = can("budgets:read");
  const token = auth.token;
  const timezone = auth.me?.user.timezone ?? "America/Argentina/Buenos_Aires";
  const [month, setMonth] = useState(currentYearMonth(timezone));
  const [dashboard, setDashboard] = useState<Dashboard | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [sortId, setSortId] = useState("amount-desc");

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void Promise.all([
      getDashboard(token, month),
      listCategories(token),
      canReadBudgets ? listBudgets(token, month) : Promise.resolve([]),
    ])
      .then(([nextDashboard, nextCategories, nextBudgets]) => {
        setDashboard(nextDashboard);
        setCategories(nextCategories);
        setBudgets(nextBudgets);
        setError(undefined);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    reload();
  }, [token, month, canReadBudgets]);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const budgetByKey = new Map(budgets.map((budget) => [`${budget.categoryId}#${budget.currency}`, budget]));
  const currencies = useMemo(
    () => [...new Set((dashboard?.expensesByCategory ?? []).map((row) => row.currency))].sort(),
    [dashboard],
  );
  const filteredRows = useMemo(() => {
    const names = new Map(categories.map((category) => [category.id, category]));
    return (dashboard?.expensesByCategory ?? []).filter((row) => {
      if (currencyFilter !== "" && row.currency !== currencyFilter) {
        return false;
      }
      return matchesText(
        [names.get(row.categoryId)?.name ?? row.categoryId, row.currency, formatAmountFromMinor(row.amountMinor)],
        query,
      );
    });
  }, [dashboard, query, categories, currencyFilter]);
  const sortOptions = useMemo((): Array<SortOption<(typeof filteredRows)[number]>> => {
    const names = new Map(categories.map((category) => [category.id, category.name]));
    return [
      { id: "amount-desc", label: "Monto ↓", compare: (a, b) => compareNumber(b.amountMinor, a.amountMinor) },
      { id: "amount-asc", label: "Monto ↑", compare: (a, b) => compareNumber(a.amountMinor, b.amountMinor) },
      {
        id: "category-az",
        label: "Categoría A-Z",
        compare: (a, b) => compareText(names.get(a.categoryId) ?? a.categoryId, names.get(b.categoryId) ?? b.categoryId),
      },
    ];
  }, [categories]);
  const sortedRows = useSortedItems(filteredRows, sortId, sortOptions);

  return (
    <Screen
      title="Resumen"
      actions={
        can("exports:read") ? (
          <GhostButton
            label={busy ? "..." : "Excel"}
            onPress={() => {
              if (token === undefined) {
                return;
              }
              setBusy(true);
              void shareMonthExcel(token, month)
                .catch((cause: unknown) => setError(toErrorMessage(cause)))
                .finally(() => setBusy(false));
            }}
          />
        ) : undefined
      }
    >
      <ScrollView
        contentContainerStyle={screenContentStyle}
        refreshControl={<RefreshControl onRefresh={reload} refreshing={busy} />}
      >
        <MonthStepper onChange={setMonth} value={month} />
        <ErrorBanner error={error} />
        {(dashboard?.totals ?? []).map((total) => (
          <Card key={total.currency}>
            <Text style={styles.currency}>{total.currency}</Text>
            <Text style={styles.muted}>En cuenta {formatAmountFromMinor(total.accountsMinor)}</Text>
            <Text style={styles.muted}>
              Tarjetas movimientos {formatAmountFromMinor(total.cardMovementsMinor)}
            </Text>
            <Text style={styles.balance}>Balance {formatAmountFromMinor(total.balanceMinor)}</Text>
          </Card>
        ))}
        {dashboard !== undefined && dashboard.totals.length === 0 ? (
          <Card>
            <EmptyState text="No hay cuentas ni movimientos de tarjeta para mostrar." />
          </Card>
        ) : null}
        <Text style={styles.section}>Gastos por categoría</Text>
        <SearchBar onChange={setQuery} value={query} />
        {currencies.length > 1 ? (
          <FilterRow>
            <Chip active={currencyFilter === ""} label="Todas" onPress={() => setCurrencyFilter("")} />
            {currencies.map((currency) => (
              <Chip
                key={currency}
                active={currencyFilter === currency}
                label={currency}
                onPress={() => setCurrencyFilter(currency)}
              />
            ))}
          </FilterRow>
        ) : null}
        <SortSelect value={sortId} onChange={setSortId} options={sortOptions} />
        {sortedRows.length === 0 ? (
          <EmptyState text="Nada para mostrar." />
        ) : (
          sortedRows.map((row) => {
            const category = categoryById.get(row.categoryId);
            const budget = budgetByKey.get(`${row.categoryId}#${row.currency}`);
            const spent = formatAmountFromMinor(row.amountMinor);
            return (
              <Card key={`${row.categoryId}-${row.currency}`}>
                <Row
                  right={
                    <Amount
                      currency={row.currency}
                      value={
                        canReadBudgets && budget !== undefined
                          ? `${spent} / ${formatAmountFromMinor(budget.amountMinor)}`
                          : spent
                      }
                    />
                  }
                  title={
                    <CategoryChip
                      name={category?.name ?? row.categoryId}
                      color={category?.color}
                    />
                  }
                />
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  currency: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  muted: {
    color: colors.muted,
  },
  balance: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.teal,
  },
  section: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginTop: space.sm,
  },
});
