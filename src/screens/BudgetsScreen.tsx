import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { createBudget, deleteBudget, listBudgets, listCategories, updateBudget } from "../api/sope";
import type { Budget, Category } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { currentYearMonth, formatAmountFromMinor, parseAmountToMinor } from "../money";
import { colors } from "../theme";
import { GhostButton, MonthStepper, SearchBar } from "../ui/controls";
import { SelectField, TextField } from "../ui/fields";
import { Amount, Card, Row } from "../ui/list";
import {
  EmptyState,
  ErrorBanner,
  FormSheet,
  Screen,
  confirmAction,
  matchesText,
  screenContentStyle,
  toErrorMessage,
  useFormDirty,
} from "../ui/primitives";

export function BudgetsScreen() {
  const auth = useAuth();
  const { can } = usePermissions();
  const token = auth.token;
  const timezone = auth.me?.user.timezone ?? "America/Argentina/Buenos_Aires";
  const [month, setMonth] = useState(currentYearMonth(timezone));
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void Promise.all([listBudgets(token, month), listCategories(token)])
      .then(([nextBudgets, nextCategories]) => {
        setBudgets(nextBudgets);
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
  const expenseCategories = categories.filter((category) => category.kind !== "INCOME");
  const filteredBudgets = useMemo(() => {
    return budgets.filter((budget) =>
      matchesText(
        [
          categoryName.get(budget.categoryId),
          formatAmountFromMinor(budget.amountMinor),
          formatAmountFromMinor(budget.spentMinor),
          budget.currency,
        ],
        query,
      ),
    );
  }, [budgets, query, categories]);
  const dirty = useFormDirty(formOpen, [categoryId, amount, currency]);

  function resetForm() {
    setEditingId(undefined);
    setCategoryId("");
    setAmount("");
    setCurrency("ARS");
    setFormOpen(false);
  }

  return (
    <Screen
      title="Presupuestos"
      actions={
        can("budgets:write") ? (
          <GhostButton
            label="Nuevo"
            onPress={() => {
              resetForm();
              setError(undefined);
              setFormOpen(true);
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
        <SearchBar onChange={setQuery} value={query} />
        <ErrorBanner error={error} />
        {filteredBudgets.length === 0 ? (
          <EmptyState text="No hay presupuestos este mes." />
        ) : (
          filteredBudgets.map((budget) => (
            <Card
              key={budget.id}
              onPress={() => {
                setEditingId(budget.id);
                setCategoryId(budget.categoryId);
                setAmount(formatAmountFromMinor(budget.amountMinor));
                setCurrency(budget.currency);
                setError(undefined);
                setFormOpen(true);
              }}
            >
              <Row
                right={<Amount currency={budget.currency} value={formatAmountFromMinor(budget.amountMinor)} />}
                subtitle={`Gastado ${formatAmountFromMinor(budget.spentMinor)} · queda ${formatAmountFromMinor(budget.remainingMinor)}`}
                title={categoryName.get(budget.categoryId) ?? budget.categoryId}
              />
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.min(100, budget.percentUsed)}%` },
                    budget.percentUsed >= 100 ? styles.barOver : undefined,
                  ]}
                />
              </View>
              <Text style={styles.percent}>{budget.percentUsed}%</Text>
            </Card>
          ))
        )}
      </ScrollView>
      <FormSheet
        busy={busy}
        dirty={dirty}
        error={error}
        onClose={resetForm}
        onDelete={
          editingId === undefined || token === undefined || !can("budgets:delete")
            ? undefined
            : () => {
                void confirmAction("Eliminar presupuesto", "¿Eliminar este presupuesto?", "Eliminar").then((ok) => {
                  if (!ok || token === undefined || editingId === undefined) {
                    return;
                  }
                  setBusy(true);
                  void deleteBudget(token, editingId)
                    .then(() => {
                      setBudgets((current) => current.filter((budget) => budget.id !== editingId));
                      resetForm();
                      setError(undefined);
                    })
                    .catch((cause: unknown) => setError(toErrorMessage(cause)))
                    .finally(() => setBusy(false));
                });
              }
        }
        onSubmit={() => {
          if (token === undefined) {
            return;
          }
          setBusy(true);
          try {
            const amountMinor = parseAmountToMinor(amount);
            if (editingId === undefined) {
              void createBudget(token, {
                categoryId,
                amountMinor,
                currency: currency.trim().toUpperCase(),
                yearMonth: month,
              })
                .then((budget) => {
                  setBudgets((current) => [...current, budget]);
                  resetForm();
                  setError(undefined);
                })
                .catch((cause: unknown) => setError(toErrorMessage(cause)))
                .finally(() => setBusy(false));
            } else {
              void updateBudget(token, editingId, amountMinor)
                .then((budget) => {
                  setBudgets((current) => current.map((item) => (item.id === budget.id ? budget : item)));
                  resetForm();
                  setError(undefined);
                })
                .catch((cause: unknown) => setError(toErrorMessage(cause)))
                .finally(() => setBusy(false));
            }
          } catch (cause: unknown) {
            setError(toErrorMessage(cause));
            setBusy(false);
          }
        }}
        submitLabel={editingId === undefined ? "Crear" : "Guardar"}
        title={editingId === undefined ? "Nuevo presupuesto" : "Editar presupuesto"}
        visible={formOpen}
      >
        {editingId === undefined ? (
          <SelectField
            label="Categoría"
            onChange={setCategoryId}
            options={[
              { value: "", label: "Elegí una categoría" },
              ...expenseCategories.map((category) => ({ value: category.id, label: category.name })),
            ]}
            value={categoryId}
          />
        ) : (
          <Text style={styles.percent}>Categoría: {categoryName.get(categoryId) ?? categoryId}</Text>
        )}
        <TextField keyboardType="decimal-pad" label="Monto" onChangeText={setAmount} placeholder="50.000,00" value={amount} />
        {editingId === undefined ? (
          <TextField label="Moneda" onChangeText={setCurrency} value={currency} />
        ) : (
          <Text style={styles.percent}>Moneda: {currency}</Text>
        )}
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  barTrack: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    backgroundColor: colors.teal,
  },
  barOver: {
    backgroundColor: colors.danger,
  },
  percent: {
    color: colors.muted,
    fontSize: 13,
  },
});
