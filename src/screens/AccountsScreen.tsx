import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "../api/sope";
import type { Account } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { accountTypeLabel } from "../labels";
import { formatAmountFromMinor } from "../money";
import { colors, space } from "../theme";
import { AuditFooter } from "../ui/AuditFooter";
import { CATEGORY_COLOR_PRESETS, ColoredChip } from "../ui/CategoryChip";
import { Chip, CollapsibleFilters, FilterRow, GhostButton, SearchBar, SortSelect } from "../ui/controls";
import { SelectField, TextField } from "../ui/fields";
import { Amount, Card, Row } from "../ui/list";
import { ListTotalsBar } from "../ui/ListTotalsBar";
import { formatLabeledTotals, sumByCurrency } from "../ui/listTotals";
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
import { compareNumber, compareText, useSortedItems, type SortOption } from "../ui/sort";

const DEFAULT_ACCOUNT_COLOR = "#64748b";

export function AccountsScreen() {
  const auth = useAuth();
  const token = auth.token;
  const members = auth.me?.household.members ?? [];
  const { can } = usePermissions();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [type, setType] = useState("CASH");
  const [currency, setCurrency] = useState("ARS");
  const [color, setColor] = useState(DEFAULT_ACCOUNT_COLOR);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortId, setSortId] = useState("name-az");

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void listAccounts(token)
      .then(setAccounts)
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    reload();
  }, [token]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      if (typeFilter !== "" && account.type !== typeFilter) {
        return false;
      }
      return matchesText(
        [account.name, accountTypeLabel(account.type), formatAmountFromMinor(account.balanceMinor), account.currency],
        query,
      );
    });
  }, [accounts, query, typeFilter]);
  const sortOptions = useMemo(
    (): Array<SortOption<Account>> => [
      { id: "name-az", label: "Nombre A-Z", compare: (a, b) => compareText(a.name, b.name) },
      { id: "balance-desc", label: "Saldo ↓", compare: (a, b) => compareNumber(b.balanceMinor, a.balanceMinor) },
      { id: "balance-asc", label: "Saldo ↑", compare: (a, b) => compareNumber(a.balanceMinor, b.balanceMinor) },
      { id: "type-az", label: "Tipo A-Z", compare: (a, b) => compareText(accountTypeLabel(a.type), accountTypeLabel(b.type)) },
    ],
    [],
  );
  const sortedAccounts = useSortedItems(filteredAccounts, sortId, sortOptions);
  const dirty = useFormDirty(formOpen, [name, type, currency, color]);

  function resetForm() {
    setEditingId(undefined);
    setName("");
    setType("CASH");
    setCurrency("ARS");
    setColor(DEFAULT_ACCOUNT_COLOR);
    setFormOpen(false);
  }

  function openCreate() {
    resetForm();
    setError(undefined);
    setFormOpen(true);
  }

  function startEdit(account: Account) {
    setEditingId(account.id);
    setName(account.name);
    setType(account.type);
    setCurrency(account.currency);
    setColor(account.color);
    setError(undefined);
    setFormOpen(true);
  }

  return (
    <Screen title="Cuentas" actions={can("accounts:write") ? <GhostButton label="Nueva" onPress={openCreate} /> : undefined}>
      <ScrollView
        contentContainerStyle={screenContentStyle}
        refreshControl={<RefreshControl onRefresh={reload} refreshing={busy} />}
      >
        <SearchBar onChange={setQuery} value={query} />
        <CollapsibleFilters activeCount={typeFilter === "" ? 0 : 1}>
          <FilterRow>
            <Chip active={typeFilter === ""} label="Todas" onPress={() => setTypeFilter("")} />
            <Chip active={typeFilter === "CASH"} label="Efectivo" onPress={() => setTypeFilter("CASH")} />
            <Chip active={typeFilter === "BANK"} label="Banco" onPress={() => setTypeFilter("BANK")} />
            <Chip active={typeFilter === "WALLET"} label="Billetera" onPress={() => setTypeFilter("WALLET")} />
          </FilterRow>
        </CollapsibleFilters>
        <SortSelect value={sortId} onChange={setSortId} options={sortOptions} />
        <ListTotalsBar
          text={formatLabeledTotals(
            "Saldo total",
            sumByCurrency(filteredAccounts, (account) => account.balanceMinor, (account) => account.currency),
          )}
        />
        <ErrorBanner error={error} />
        {sortedAccounts.length === 0 ? (
          <EmptyState text="Todavía no hay cuentas." />
        ) : (
          sortedAccounts.map((account) => (
            <Card key={account.id} onPress={() => startEdit(account)}>
              <Row
                right={<Amount currency={account.currency} value={formatAmountFromMinor(account.balanceMinor)} />}
                subtitle={accountTypeLabel(account.type)}
                title={<ColoredChip name={account.name} color={account.color} />}
              />
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
          editingId === undefined || token === undefined || !can("accounts:delete")
            ? undefined
            : () => {
                void confirmAction("Eliminar cuenta", "¿Eliminar esta cuenta?", "Eliminar").then((ok) => {
                  if (!ok || token === undefined || editingId === undefined) {
                    return;
                  }
                  setBusy(true);
                  void deleteAccount(token, editingId)
                    .then(() => {
                      setAccounts((current) => current.filter((account) => account.id !== editingId));
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
          const body = { name: name.trim(), type, currency: currency.trim().toUpperCase(), color };
          const request =
            editingId === undefined ? createAccount(token, body) : updateAccount(token, editingId, body);
          void request
            .then(() => listAccounts(token))
            .then((nextAccounts) => {
              setAccounts(nextAccounts);
              resetForm();
              setError(undefined);
            })
            .catch((cause: unknown) => setError(toErrorMessage(cause)))
            .finally(() => setBusy(false));
        }}
        submitLabel={editingId === undefined ? "Crear" : "Guardar"}
        title={editingId === undefined ? "Nueva cuenta" : "Editar cuenta"}
        visible={formOpen}
      >
        <TextField label="Nombre" onChangeText={setName} value={name} />
        <SelectField
          label="Tipo"
          onChange={setType}
          options={[
            { value: "CASH", label: "Efectivo" },
            { value: "BANK", label: "Banco" },
            { value: "WALLET", label: "Billetera" },
            { value: "OTHER", label: "Otra" },
          ]}
          value={type}
        />
        <TextField label="Moneda" onChangeText={setCurrency} value={currency} />
        <View style={styles.colorBlock}>
          <ColoredChip name={name.trim() === "" ? "Cuenta" : name.trim()} color={color} />
          <View style={styles.swatches}>
            {CATEGORY_COLOR_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setColor(preset)}
                style={[
                  styles.swatch,
                  { backgroundColor: preset },
                  color === preset ? styles.swatchActive : undefined,
                ]}
              />
            ))}
          </View>
        </View>
        {editingId === undefined ? null : (
          <AuditFooter audit={accounts.find((account) => account.id === editingId)} members={members} />
        )}
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  colorBlock: {
    gap: space.sm,
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.line,
  },
  swatchActive: {
    borderColor: colors.ink,
  },
});

