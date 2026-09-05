import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "../api/sope";
import type { Account } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { accountTypeLabel } from "../labels";
import { formatAmountFromMinor } from "../money";
import { Chip, FilterRow, GhostButton, SearchBar } from "../ui/controls";
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

export function AccountsScreen() {
  const token = useAuth().token;
  const { can } = usePermissions();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [type, setType] = useState("CASH");
  const [currency, setCurrency] = useState("ARS");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

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
  const dirty = useFormDirty(formOpen, [name, type, currency]);

  function resetForm() {
    setEditingId(undefined);
    setName("");
    setType("CASH");
    setCurrency("ARS");
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
        <FilterRow>
          <Chip active={typeFilter === ""} label="Todas" onPress={() => setTypeFilter("")} />
          <Chip active={typeFilter === "CASH"} label="Efectivo" onPress={() => setTypeFilter("CASH")} />
          <Chip active={typeFilter === "BANK"} label="Banco" onPress={() => setTypeFilter("BANK")} />
          <Chip active={typeFilter === "WALLET"} label="Billetera" onPress={() => setTypeFilter("WALLET")} />
        </FilterRow>
        <ErrorBanner error={error} />
        {filteredAccounts.length === 0 ? (
          <EmptyState text="Todavía no hay cuentas." />
        ) : (
          filteredAccounts.map((account) => (
            <Card key={account.id} onPress={() => startEdit(account)}>
              <Row
                right={<Amount currency={account.currency} value={formatAmountFromMinor(account.balanceMinor)} />}
                subtitle={accountTypeLabel(account.type)}
                title={account.name}
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
          const body = { name: name.trim(), type, currency: currency.trim().toUpperCase() };
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
      </FormSheet>
    </Screen>
  );
}
