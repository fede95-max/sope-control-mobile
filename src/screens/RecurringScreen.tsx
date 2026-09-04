import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView } from "react-native";
import {
  createRecurring,
  deleteRecurring,
  listAccounts,
  listCards,
  listCategories,
  listRecurring,
  updateRecurring,
} from "../api/sope";
import type { Account, Card, Category, Recurring } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { typeLabel } from "../labels";
import { currentCalendarDate, formatAmountFromMinor, formatCalendarDate, parseAmountToMinor } from "../money";
import { Chip, FilterRow, GhostButton, SearchBar } from "../ui/controls";
import { DateField, SelectField, TextField } from "../ui/fields";
import { Amount, Card as ListCard, Row } from "../ui/list";
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

export function RecurringScreen() {
  const auth = useAuth();
  const token = auth.token;
  const timezone = auth.me?.user.timezone ?? "America/Argentina/Buenos_Aires";
  const [items, setItems] = useState<Recurring[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [type, setType] = useState("EXPENSE");
  const [amount, setAmount] = useState("");
  const [startOn, setStartOn] = useState(currentCalendarDate(timezone));
  const [endOn, setEndOn] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [description, setDescription] = useState("");
  const [installmentCount, setInstallmentCount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [cardId, setCardId] = useState("");
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
    void Promise.all([listRecurring(token), listAccounts(token), listCategories(token), listCards(token)])
      .then(([nextItems, nextAccounts, nextCategories, nextCards]) => {
        setItems(nextItems);
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
  }, [token]);

  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const accountName = new Map(accounts.map((account) => [account.id, account.name]));
  const cardName = new Map(cards.map((card) => [card.id, card.name]));
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== "" && item.type !== typeFilter) {
        return false;
      }
      return matchesText(
        [
          item.name,
          typeLabel(item.type),
          formatAmountFromMinor(item.amountMinor),
          categoryName.get(item.categoryId ?? ""),
          accountName.get(item.accountId ?? ""),
          cardName.get(item.cardId ?? ""),
          item.description,
        ],
        query,
      );
    });
  }, [items, query, typeFilter, categories, accounts, cards]);
  const hasInstallments = type === "EXPENSE" && installmentCount.trim() !== "";
  const dirty = useFormDirty(formOpen, [
    name,
    type,
    amount,
    startOn,
    endOn,
    dayOfMonth,
    description,
    installmentCount,
    categoryId,
    accountId,
    cardId,
  ]);
  const creditCards = cards.filter((card) => card.kind === "CREDIT");
  const selectedCard = creditCards.find((card) => card.id === cardId);
  const filteredCategories = categories.filter((category) => {
    if (type === "INCOME") {
      return category.kind === "INCOME" || category.kind === "BOTH";
    }
    return category.kind === "EXPENSE" || category.kind === "BOTH";
  });

  function resetForm() {
    setEditingId(undefined);
    setName("");
    setType("EXPENSE");
    setAmount("");
    setStartOn(currentCalendarDate(timezone));
    setEndOn("");
    setDayOfMonth(String(Number(currentCalendarDate(timezone).slice(8, 10))));
    setDescription("");
    setInstallmentCount("");
    setCategoryId("");
    setAccountId("");
    setCardId("");
    setFormOpen(false);
  }

  function startEdit(item: Recurring) {
    setEditingId(item.id);
    setName(item.name);
    setType(item.type);
    setAmount(formatAmountFromMinor(item.amountMinor));
    setStartOn(item.startOn);
    setEndOn(item.endOn ?? "");
    setDayOfMonth(String(item.dayOfMonth));
    setDescription(item.description ?? "");
    setInstallmentCount(item.installmentCount === undefined ? "" : String(item.installmentCount));
    setCategoryId(item.categoryId ?? "");
    setAccountId(item.accountId ?? "");
    setCardId(item.cardId ?? "");
    setError(undefined);
    setFormOpen(true);
  }

  return (
    <Screen
      title="Recurrentes"
      actions={
        <GhostButton
          label="Nuevo"
          onPress={() => {
            resetForm();
            setError(undefined);
            setFormOpen(true);
          }}
        />
      }
    >
      <ScrollView
        contentContainerStyle={screenContentStyle}
        refreshControl={<RefreshControl onRefresh={reload} refreshing={busy} />}
      >
        <SearchBar onChange={setQuery} value={query} />
        <FilterRow>
          <Chip active={typeFilter === ""} label="Todos" onPress={() => setTypeFilter("")} />
          <Chip active={typeFilter === "EXPENSE"} label="Egreso" onPress={() => setTypeFilter("EXPENSE")} />
          <Chip active={typeFilter === "INCOME"} label="Ingreso" onPress={() => setTypeFilter("INCOME")} />
        </FilterRow>
        <ErrorBanner error={error} />
        {filteredItems.length === 0 ? (
          <EmptyState text="No hay recurrentes." />
        ) : (
          filteredItems.map((item) => {
            const extras = [
              categoryName.get(item.categoryId ?? "") ?? "",
              accountName.get(item.accountId ?? "") ?? "",
              cardName.get(item.cardId ?? "") ?? "",
              `día ${item.dayOfMonth}`,
              item.installmentCount === undefined ? "" : `${item.installmentCount} cuotas`,
            ].filter((part) => part !== "");
            return (
              <ListCard key={item.id} onPress={() => startEdit(item)}>
                <Row
                  meta={extras.join(" · ")}
                  right={<Amount currency={item.currency} value={formatAmountFromMinor(item.amountMinor)} />}
                  subtitle={`${typeLabel(item.type)} · ${formatCalendarDate(item.startOn)}${item.endOn === undefined ? "" : ` → ${formatCalendarDate(item.endOn)}`}`}
                  title={item.name}
                />
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
                void confirmAction(
                  "Eliminar recurrente",
                  "¿Eliminar este recurrente? Se borran los movimientos de este mes en adelante. Los meses anteriores quedan.",
                  "Eliminar",
                ).then((ok) => {
                  if (!ok || token === undefined || editingId === undefined) {
                    return;
                  }
                  setBusy(true);
                  void deleteRecurring(token, editingId)
                    .then(() => {
                      setItems((current) => current.filter((item) => item.id !== editingId));
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
            const body: Record<string, unknown> = {
              name: name.trim(),
              type,
              amountMinor: parseAmountToMinor(amount),
              startOn,
              dayOfMonth: Number(dayOfMonth),
              categoryId,
            };
            if (description.trim() !== "") {
              body.description = description.trim();
            } else if (editingId !== undefined) {
              body.description = null;
            }
            if (type === "EXPENSE" && installmentCount.trim() !== "") {
              body.installmentCount = Number(installmentCount);
              if (editingId !== undefined) {
                body.endOn = null;
              }
            } else {
              if (editingId !== undefined) {
                body.installmentCount = null;
              }
              if (endOn.trim() !== "") {
                body.endOn = endOn;
              } else if (editingId !== undefined) {
                body.endOn = null;
              }
            }
            if (cardId !== "" && selectedCard !== undefined) {
              body.cardId = cardId;
            } else {
              body.accountId = accountId;
              if (editingId !== undefined) {
                body.cardId = null;
              }
            }
            if (editingId === undefined) {
              void createRecurring(token, { ...body, frequency: "MONTHLY" })
                .then((created) => {
                  setItems((current) => [...current, created]);
                  resetForm();
                  setError(undefined);
                })
                .catch((cause: unknown) => setError(toErrorMessage(cause)))
                .finally(() => setBusy(false));
            } else {
              void updateRecurring(token, editingId, body)
                .then((updated) => {
                  setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
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
        title={editingId === undefined ? "Nuevo recurrente" : "Editar recurrente"}
        visible={formOpen}
      >
        <TextField label="Nombre" onChangeText={setName} value={name} />
        <SelectField
          disabled={editingId !== undefined}
          label="Tipo"
          onChange={(next) => {
            setType(next);
            if (next !== "EXPENSE") {
              setCardId("");
              setInstallmentCount("");
            }
          }}
          options={[
            { value: "INCOME", label: "Ingreso" },
            { value: "EXPENSE", label: "Egreso" },
          ]}
          value={type}
        />
        <TextField keyboardType="decimal-pad" label="Monto" onChangeText={setAmount} placeholder="15.000,00" value={amount} />
        <TextField label="Descripción" onChangeText={setDescription} value={description} />
        <DateField label="Desde" onChange={setStartOn} value={startOn} />
        {type === "EXPENSE" ? (
          <TextField
            keyboardType="numeric"
            label="Cuotas (opcional)"
            onChangeText={setInstallmentCount}
            placeholder="Ej: 12"
            value={installmentCount}
          />
        ) : null}
        {hasInstallments ? null : (
          <DateField label="Hasta (vacío = 24 meses)" onChange={setEndOn} value={endOn} />
        )}
        <TextField keyboardType="numeric" label="Día de cobro" onChangeText={setDayOfMonth} value={dayOfMonth} />
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
            label="Tarjeta de crédito (opcional)"
            onChange={(nextCardId) => {
              setCardId(nextCardId);
              if (nextCardId !== "") {
                setAccountId("");
              }
            }}
            options={[
              { value: "", label: "Sin tarjeta" },
              ...creditCards.map((card) => ({ value: card.id, label: `${card.name} · ${card.last4}` })),
            ]}
            value={cardId}
          />
        ) : null}
        {selectedCard === undefined ? (
          <SelectField
            label="Cuenta"
            onChange={setAccountId}
            options={[
              { value: "", label: "Elegí una cuenta" },
              ...accounts.map((account) => ({ value: account.id, label: account.name })),
            ]}
            value={accountId}
          />
        ) : null}
      </FormSheet>
    </Screen>
  );
}
