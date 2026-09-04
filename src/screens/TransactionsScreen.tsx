import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text } from "react-native";
import {
  createTransaction,
  deleteTransaction,
  listAccounts,
  listCards,
  listCategories,
  listTransactions,
  updateTransaction,
} from "../api/sope";
import type { Account, Card, Category, Transaction, TransactionStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { resolveAccountLabel, resolveCardLabel, typeLabel } from "../labels";
import {
  currentCalendarDate,
  currentYearMonth,
  formatAmountFromMinor,
  formatCalendarDate,
  formatInstallment,
  parseAmountToMinor,
} from "../money";
import { Chip, FilterRow, GhostButton, MonthStepper, SearchBar } from "../ui/controls";
import { DateField, SelectField, TextField } from "../ui/fields";
import { Amount, Card as ListCard, Row } from "../ui/list";
import {
  EmptyState,
  ErrorBanner,
  FormSheet,
  Screen,
  StatusPill,
  confirmAction,
  matchesText,
  screenContentStyle,
  toErrorMessage,
  useFormDirty,
} from "../ui/primitives";

export function TransactionsScreen() {
  const auth = useAuth();
  const token = auth.token;
  const timezone = auth.me?.user.timezone ?? "America/Argentina/Buenos_Aires";
  const [month, setMonth] = useState(currentYearMonth(timezone));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [type, setType] = useState("EXPENSE");
  const [status, setStatus] = useState<TransactionStatus>("APPROVED");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(currentCalendarDate(timezone));
  const [approvedOn, setApprovedOn] = useState(currentCalendarDate(timezone));
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [cardId, setCardId] = useState("");
  const [installmentCount, setInstallmentCount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void Promise.all([
      listTransactions(token, month),
      listAccounts(token),
      listCategories(token),
      listCards(token),
    ])
      .then(([nextTransactions, nextAccounts, nextCategories, nextCards]) => {
        setTransactions(nextTransactions);
        setAccounts(nextAccounts);
        setCategories(nextCategories);
        setCards(nextCards);
        setError(undefined);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    reload();
  }, [token, month]);

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const accountName = new Map(accounts.map((account) => [account.id, account.name]));
  const cardName = new Map(cards.map((card) => [card.id, card.name]));
  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (typeFilter !== "" && transaction.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== "" && transaction.status !== statusFilter) {
        return false;
      }
      return matchesText(
        [
          formatCalendarDate(transaction.occurredOn),
          typeLabel(transaction.type),
          formatAmountFromMinor(transaction.amountMinor),
          categoryName.get(transaction.categoryId ?? ""),
          resolveAccountLabel(transaction, accountName),
          resolveCardLabel(transaction, cardName),
          transaction.description,
        ],
        query,
      );
    });
  }, [transactions, query, typeFilter, statusFilter, categories, accounts, cards]);
  const dirty = useFormDirty(formOpen, [
    type,
    status,
    amount,
    occurredOn,
    approvedOn,
    description,
    categoryId,
    accountId,
    fromAccountId,
    toAccountId,
    cardId,
    installmentCount,
  ]);
  const selectedCard = cards.find((card) => card.id === cardId);
  const filteredCategories = categories.filter((category) => {
    if (type === "TRANSFER") {
      return false;
    }
    if (type === "INCOME") {
      return category.kind === "INCOME" || category.kind === "BOTH";
    }
    return category.kind === "EXPENSE" || category.kind === "BOTH";
  });
  const editing = transactions.find((item) => item.id === editingId);

  function resetForm() {
    setEditingId(undefined);
    setType("EXPENSE");
    setStatus("APPROVED");
    setAmount("");
    setOccurredOn(currentCalendarDate(timezone));
    setApprovedOn(currentCalendarDate(timezone));
    setDescription("");
    setCategoryId("");
    setAccountId("");
    setFromAccountId("");
    setToAccountId("");
    setCardId("");
    setInstallmentCount("");
    setFormOpen(false);
  }

  function openCreate() {
    resetForm();
    setError(undefined);
    setFormOpen(true);
  }

  function startEdit(transaction: Transaction) {
    setEditingId(transaction.id);
    setType(transaction.type);
    setStatus(transaction.status);
    setAmount(formatAmountFromMinor(transaction.amountMinor));
    setOccurredOn(transaction.occurredOn);
    setApprovedOn(transaction.approvedOn ?? (transaction.status === "APPROVED" ? transaction.occurredOn : ""));
    setDescription(transaction.description ?? "");
    setCategoryId(transaction.categoryId ?? "");
    setAccountId(transaction.accountId ?? "");
    setFromAccountId(transaction.fromAccountId ?? "");
    setToAccountId(transaction.toAccountId ?? "");
    setCardId(transaction.cardId ?? "");
    setInstallmentCount("");
    setError(undefined);
    setFormOpen(true);
  }

  function buildBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {
      amountMinor: parseAmountToMinor(amount),
      occurredOn,
      status,
    };
    if (status === "APPROVED" && approvedOn !== "") {
      body.approvedOn = approvedOn;
    }
    if (description.trim() !== "") {
      body.description = description.trim();
    } else if (editingId !== undefined) {
      body.description = null;
    }
    if (type === "TRANSFER") {
      body.fromAccountId = fromAccountId;
      body.toAccountId = toAccountId;
    } else {
      body.categoryId = categoryId;
      if (type === "EXPENSE" && cardId !== "") {
        body.cardId = cardId;
        if (selectedCard?.kind !== "CREDIT") {
          body.accountId = accountId;
        }
      } else {
        body.accountId = accountId;
      }
    }
    if (editingId === undefined && type === "EXPENSE" && installmentCount.trim() !== "") {
      body.installmentCount = Number(installmentCount);
    }
    return body;
  }

  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.name} (${account.currency})`,
  }));

  return (
    <Screen title="Movimientos" actions={<GhostButton label="Nuevo" onPress={openCreate} />}>
      <ScrollView
        contentContainerStyle={screenContentStyle}
        refreshControl={<RefreshControl onRefresh={reload} refreshing={busy} />}
      >
        <MonthStepper onChange={setMonth} value={month} />
        <SearchBar onChange={setQuery} value={query} />
        <FilterRow>
          <Chip active={typeFilter === ""} label="Todos" onPress={() => setTypeFilter("")} />
          <Chip active={typeFilter === "EXPENSE"} label="Egreso" onPress={() => setTypeFilter("EXPENSE")} />
          <Chip active={typeFilter === "INCOME"} label="Ingreso" onPress={() => setTypeFilter("INCOME")} />
          <Chip active={typeFilter === "TRANSFER"} label="Transfer" onPress={() => setTypeFilter("TRANSFER")} />
          <Chip active={statusFilter === "PENDING"} label="Pendiente" onPress={() => setStatusFilter(statusFilter === "PENDING" ? "" : "PENDING")} />
        </FilterRow>
        <ErrorBanner error={error} />
        {filteredTransactions.length === 0 ? (
          <EmptyState text="No hay movimientos." />
        ) : (
          filteredTransactions.map((transaction) => {
            const extras = [
              categoryName.get(transaction.categoryId ?? "") ?? "",
              resolveAccountLabel(transaction, accountName),
              resolveCardLabel(transaction, cardName),
              formatInstallment(transaction.installmentNumber, transaction.installmentCount),
            ].filter((part) => part !== "");
            return (
              <ListCard key={transaction.id} onPress={() => startEdit(transaction)}>
                <Row
                  meta={extras.join(" · ")}
                  right={
                    <Amount
                      currency={transaction.currency}
                      value={formatAmountFromMinor(transaction.amountMinor)}
                    />
                  }
                  subtitle={`${formatCalendarDate(transaction.occurredOn)} · ${typeLabel(transaction.type)}`}
                  title={transaction.description ?? typeLabel(transaction.type)}
                />
                <StatusPill pending={transaction.status === "PENDING"} />
              </ListCard>
            );
          })
        )}
      </ScrollView>
      <FormSheet
        busy={busy}
        dirty={dirty}
        error={error}
        onClose={resetForm}
        onDelete={
          editingId === undefined || token === undefined
            ? undefined
            : () => {
                void confirmAction("Eliminar movimiento", "¿Eliminar este movimiento?", "Eliminar").then((ok) => {
                  if (!ok || token === undefined || editingId === undefined) {
                    return;
                  }
                  setBusy(true);
                  void deleteTransaction(token, editingId)
                    .then(() => {
                      setTransactions((current) => current.filter((item) => item.id !== editingId));
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
            const body = buildBody();
            const request =
              editingId === undefined
                ? createTransaction(token, { type, ...body })
                : updateTransaction(token, editingId, body);
            void request
              .then(() => listTransactions(token, month))
              .then((nextTransactions) => {
                setTransactions(nextTransactions);
                resetForm();
                setError(undefined);
              })
              .catch((cause: unknown) => setError(toErrorMessage(cause)))
              .finally(() => setBusy(false));
          } catch (cause: unknown) {
            setError(toErrorMessage(cause));
            setBusy(false);
          }
        }}
        submitLabel={editingId === undefined ? "Registrar" : "Guardar"}
        title={editingId === undefined ? "Nuevo movimiento" : "Editar movimiento"}
        visible={formOpen}
      >
        <SelectField
          disabled={editingId !== undefined}
          label="Tipo"
          onChange={setType}
          options={[
            { value: "EXPENSE", label: "Egreso" },
            { value: "INCOME", label: "Ingreso" },
            { value: "TRANSFER", label: "Transferencia" },
          ]}
          value={type}
        />
        <SelectField
          label="Estado"
          onChange={(next) => {
            const nextStatus = next as TransactionStatus;
            setStatus(nextStatus);
            if (nextStatus === "PENDING") {
              setApprovedOn("");
            } else if (approvedOn === "") {
              setApprovedOn(currentCalendarDate(timezone));
            }
          }}
          options={[
            { value: "APPROVED", label: "Aprobado" },
            { value: "PENDING", label: "Pendiente" },
          ]}
          value={status}
        />
        <TextField keyboardType="decimal-pad" label="Monto" onChangeText={setAmount} placeholder="1.234,56" value={amount} />
        <DateField label="Fecha" onChange={setOccurredOn} value={occurredOn} />
        {status === "APPROVED" ? (
          <DateField label="Acreditación" onChange={setApprovedOn} value={approvedOn} />
        ) : null}
        <TextField label="Descripción" onChangeText={setDescription} value={description} />
        {editingId === undefined && type === "EXPENSE" ? (
          <TextField
            keyboardType="numeric"
            label="Cuotas (opcional)"
            onChangeText={setInstallmentCount}
            placeholder="Ej: 12"
            value={installmentCount}
          />
        ) : null}
        {editing?.installmentCount !== undefined ? (
          <Text>
            Cuota {formatInstallment(editing.installmentNumber, editing.installmentCount)}
          </Text>
        ) : null}
        {type === "TRANSFER" ? (
          <>
            <SelectField
              label="Desde"
              onChange={setFromAccountId}
              options={[{ value: "", label: "Elegí una cuenta" }, ...accountOptions]}
              value={fromAccountId}
            />
            <SelectField
              label="Hacia"
              onChange={setToAccountId}
              options={[{ value: "", label: "Elegí una cuenta" }, ...accountOptions]}
              value={toAccountId}
            />
          </>
        ) : (
          <>
            <SelectField
              label="Categoría"
              onChange={setCategoryId}
              options={[
                { value: "", label: "Elegí una categoría" },
                ...filteredCategories.map((category) => ({ value: category.id, label: category.name })),
              ]}
              value={categoryId}
            />
            {type === "EXPENSE" ? (
              <SelectField
                label="Tarjeta (opcional)"
                onChange={(nextCardId) => {
                  setCardId(nextCardId);
                  const card = cards.find((item) => item.id === nextCardId);
                  if (card?.kind === "CREDIT") {
                    setAccountId("");
                  }
                }}
                options={[
                  { value: "", label: "Sin tarjeta" },
                  ...cards.map((card) => ({
                    value: card.id,
                    label: `${card.name} ${card.kind} · ${card.last4}`,
                  })),
                ]}
                value={cardId}
              />
            ) : null}
            {selectedCard?.kind === "CREDIT" ? null : (
              <SelectField
                label="Cuenta"
                onChange={setAccountId}
                options={[{ value: "", label: "Elegí una cuenta" }, ...accountOptions]}
                value={accountId}
              />
            )}
          </>
        )}
      </FormSheet>
    </Screen>
  );
}
