import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { getDashboard, listCategories, shareMonthExcel } from "../api/sope";
import type { Category, Dashboard } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { currentYearMonth, formatAmountFromMinor } from "../money";
import { colors, space } from "../theme";
import { GhostButton, MonthStepper, SearchBar } from "../ui/controls";
import { Card, Row, Amount } from "../ui/list";
import { EmptyState, ErrorBanner, Screen, matchesText, screenContentStyle, toErrorMessage } from "../ui/primitives";

export function DashboardScreen() {
  const auth = useAuth();
  const { can } = usePermissions();
  const token = auth.token;
  const timezone = auth.me?.user.timezone ?? "America/Argentina/Buenos_Aires";
  const [month, setMonth] = useState(currentYearMonth(timezone));
  const [dashboard, setDashboard] = useState<Dashboard | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void Promise.all([getDashboard(token, month), listCategories(token)])
      .then(([nextDashboard, nextCategories]) => {
        setDashboard(nextDashboard);
        setCategories(nextCategories);
        setError(undefined);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    reload();
  }, [token, month]);

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const filteredRows = useMemo(() => {
    return (dashboard?.expensesByCategory ?? []).filter((row) =>
      matchesText(
        [categoryName.get(row.categoryId) ?? row.categoryId, row.currency, formatAmountFromMinor(row.amountMinor)],
        query,
      ),
    );
  }, [dashboard, query, categories]);

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
        {filteredRows.length === 0 ? (
          <EmptyState text="Nada para mostrar." />
        ) : (
          filteredRows.map((row) => (
            <Card key={`${row.categoryId}-${row.currency}`}>
              <Row
                right={<Amount currency={row.currency} value={formatAmountFromMinor(row.amountMinor)} />}
                title={categoryName.get(row.categoryId) ?? row.categoryId}
              />
            </Card>
          ))
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
