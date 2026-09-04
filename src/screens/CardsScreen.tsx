import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  createCard,
  deleteCard,
  listAccounts,
  listCardOverview,
  updateCard,
  upsertCardPeriod,
} from "../api/sope";
import type { CardOverview } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { cardKindLabel } from "../labels";
import { currentYearMonth, formatAmountFromMinor, formatCalendarDate } from "../money";
import { colors } from "../theme";
import { Chip, FilterRow, GhostButton, MonthStepper, SearchBar } from "../ui/controls";
import { DateField, SelectField, TextField } from "../ui/fields";
import { Card, Row } from "../ui/list";
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

function currencyAmount(
  totals: Array<{ currency: string; purchaseTotalMinor: number }>,
  currency: string,
): string {
  const found = totals.find((item) => item.currency === currency);
  return formatAmountFromMinor(found?.purchaseTotalMinor ?? 0);
}

export function CardsScreen() {
  const auth = useAuth();
  const token = auth.token;
  const timezone = auth.me?.user.timezone ?? "America/Argentina/Buenos_Aires";
  const [viewMonth, setViewMonth] = useState(currentYearMonth(timezone));
  const [cards, setCards] = useState<CardOverview[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [periodCardId, setPeriodCardId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("DEBIT");
  const [brand, setBrand] = useState("VISA");
  const [last4, setLast4] = useState("");
  const [accountId, setAccountId] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [periodMonth, setPeriodMonth] = useState(currentYearMonth(timezone));
  const [closingOn, setClosingOn] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("");

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void Promise.all([listCardOverview(token, viewMonth), listAccounts(token)])
      .then(([nextCards, nextAccounts]) => {
        setCards(nextCards);
        setAccounts(nextAccounts);
        setError(undefined);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    reload();
  }, [token, viewMonth]);

  const missingPeriod = cards.filter((card) => card.kind === "CREDIT" && card.period === undefined);
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (kindFilter !== "" && card.kind !== kindFilter) {
        return false;
      }
      return matchesText(
        [card.name, card.kind, card.brand, card.last4, formatCalendarDate(card.period?.closingOn), formatCalendarDate(card.dueOn)],
        query,
      );
    });
  }, [cards, query, kindFilter]);
  const dirty = useFormDirty(formOpen, [name, kind, brand, last4, accountId, currency, periodMonth, closingOn, dueOn]);
  const periodDirty = useFormDirty(periodOpen, [periodMonth, closingOn, dueOn]);

  function closeForm() {
    setFormOpen(false);
    setEditingId(undefined);
    setName("");
    setKind("DEBIT");
    setBrand("VISA");
    setLast4("");
    setAccountId("");
    setCurrency("ARS");
    setPeriodMonth(viewMonth);
    setClosingOn("");
    setDueOn("");
  }

  function closePeriod() {
    setPeriodOpen(false);
    setPeriodCardId(undefined);
    setClosingOn("");
    setDueOn("");
    setPeriodMonth(viewMonth);
  }

  function openCreate() {
    closeForm();
    setPeriodMonth(viewMonth);
    setFormOpen(true);
    setError(undefined);
  }

  function startEdit(card: CardOverview) {
    setEditingId(card.id);
    setName(card.name);
    setKind(card.kind);
    setBrand(card.brand);
    setLast4(card.last4);
    setAccountId(card.accountId ?? "");
    setCurrency(card.currency);
    setPeriodMonth(viewMonth);
    setClosingOn(card.period?.closingOn ?? "");
    setDueOn(card.period?.dueOn ?? "");
    setFormOpen(true);
    setError(undefined);
  }

  function openPeriod(card: CardOverview) {
    setPeriodCardId(card.id);
    setPeriodMonth(viewMonth);
    setClosingOn(card.period?.closingOn ?? "");
    setDueOn(card.period?.dueOn ?? "");
    setPeriodOpen(true);
    setError(undefined);
  }

  const periodCard = cards.find((card) => card.id === periodCardId);

  return (
    <Screen title="Tarjetas" actions={<GhostButton label="Nueva" onPress={openCreate} />}>
      <ScrollView
        contentContainerStyle={screenContentStyle}
        refreshControl={<RefreshControl onRefresh={reload} refreshing={busy} />}
      >
        <MonthStepper onChange={setViewMonth} value={viewMonth} />
        <SearchBar onChange={setQuery} value={query} />
        <FilterRow>
          <Chip active={kindFilter === ""} label="Todas" onPress={() => setKindFilter("")} />
          <Chip active={kindFilter === "CREDIT"} label="Crédito" onPress={() => setKindFilter("CREDIT")} />
          <Chip active={kindFilter === "DEBIT"} label="Débito" onPress={() => setKindFilter("DEBIT")} />
        </FilterRow>
        <ErrorBanner error={error} />
        {missingPeriod.length > 0 ? (
          <Card onPress={() => openPeriod(missingPeriod[0]!)}>
            <Text style={styles.alertTitle}>Falta cierre y vencimiento</Text>
            <Text style={styles.alertText}>{missingPeriod.map((card) => card.name).join(", ")}</Text>
          </Card>
        ) : null}
        {filteredCards.length === 0 ? (
          <EmptyState text="Todavía no hay tarjetas." />
        ) : (
          filteredCards.map((card) => (
            <Card key={card.id} onPress={() => startEdit(card)}>
              <Row
                subtitle={`${cardKindLabel(card.kind)} · ${card.brand} · ${card.last4}`}
                title={card.name}
              />
              {card.kind === "CREDIT" ? (
                <View style={styles.totals}>
                  <Text style={styles.meta}>ARS {currencyAmount(card.totalsByCurrency, "ARS")}</Text>
                  <Text style={styles.meta}>USD {currencyAmount(card.totalsByCurrency, "USD")}</Text>
                  <Text style={styles.meta}>
                    Cierre {card.period?.closingOn === undefined ? "sin cargar" : formatCalendarDate(card.period.closingOn)}
                  </Text>
                  <Text style={styles.meta}>
                    Vence {card.dueOn === undefined ? "sin cargar" : formatCalendarDate(card.dueOn)}
                  </Text>
                  <GhostButton label="Periodo" onPress={() => openPeriod(card)} />
                </View>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
      <FormSheet
        busy={busy}
        dirty={dirty}
        error={error}
        onClose={closeForm}
        onDelete={
          editingId === undefined || token === undefined
            ? undefined
            : () => {
                void confirmAction("Eliminar tarjeta", "¿Eliminar esta tarjeta?", "Eliminar").then((ok) => {
                  if (!ok || token === undefined || editingId === undefined) {
                    return;
                  }
                  setBusy(true);
                  void deleteCard(token, editingId)
                    .then(() => {
                      closeForm();
                      reload();
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
          const body: Record<string, unknown> = { name: name.trim(), brand, last4 };
          if (kind === "DEBIT") {
            body.accountId = accountId;
          } else {
            body.currency = currency.trim().toUpperCase();
            body.yearMonth = periodMonth;
            body.closingOn = closingOn;
            body.dueOn = dueOn;
          }
          const afterSave = (cardId: string) => {
            if (kind !== "CREDIT" || token === undefined) {
              closeForm();
              reload();
              setBusy(false);
              return;
            }
            void upsertCardPeriod(token, cardId, periodMonth, { closingOn, dueOn })
              .then(() => {
                closeForm();
                reload();
              })
              .catch((cause: unknown) => setError(toErrorMessage(cause)))
              .finally(() => setBusy(false));
          };
          if (editingId === undefined) {
            body.kind = kind;
            void createCard(token, body)
              .then((card) => {
                if (kind === "CREDIT") {
                  closeForm();
                  reload();
                  setBusy(false);
                  return;
                }
                afterSave(card.id);
              })
              .catch((cause: unknown) => {
                setError(toErrorMessage(cause));
                setBusy(false);
              });
          } else {
            void updateCard(token, editingId, {
              name: name.trim(),
              brand,
              last4,
              ...(kind === "DEBIT" ? { accountId } : { currency: currency.trim().toUpperCase() }),
            })
              .then((card) => afterSave(card.id))
              .catch((cause: unknown) => {
                setError(toErrorMessage(cause));
                setBusy(false);
              });
          }
        }}
        submitLabel={editingId === undefined ? "Crear" : "Guardar"}
        title={editingId === undefined ? "Nueva tarjeta" : "Editar tarjeta"}
        visible={formOpen}
      >
        <TextField label="Nombre" onChangeText={setName} value={name} />
        {editingId === undefined ? (
          <SelectField
            label="Tipo"
            onChange={setKind}
            options={[
              { value: "DEBIT", label: "Débito" },
              { value: "CREDIT", label: "Crédito" },
            ]}
            value={kind}
          />
        ) : (
          <Text style={styles.meta}>Tipo: {cardKindLabel(kind)} (no editable)</Text>
        )}
        <SelectField
          label="Marca"
          onChange={setBrand}
          options={[
            { value: "VISA", label: "Visa" },
            { value: "MASTERCARD", label: "Mastercard" },
            { value: "AMEX", label: "Amex" },
            { value: "NARANJA", label: "Naranja" },
            { value: "OTHER", label: "Otra" },
          ]}
          value={brand}
        />
        <TextField keyboardType="numeric" label="Últimos 4" onChangeText={setLast4} value={last4} />
        {kind === "DEBIT" ? (
          <SelectField
            label="Cuenta"
            onChange={setAccountId}
            options={[
              { value: "", label: "Elegí una cuenta" },
              ...accounts.map((account) => ({ value: account.id, label: account.name })),
            ]}
            value={accountId}
          />
        ) : (
          <>
            <TextField label="Moneda" onChangeText={setCurrency} value={currency} />
            <DateField label="Fecha de cierre" onChange={setClosingOn} value={closingOn} />
            <DateField label="Fecha de vencimiento" onChange={setDueOn} value={dueOn} />
          </>
        )}
      </FormSheet>
      <FormSheet
        busy={busy}
        dirty={periodDirty}
        error={error}
        onClose={closePeriod}
        onSubmit={() => {
          if (token === undefined || periodCardId === undefined) {
            return;
          }
          setBusy(true);
          void upsertCardPeriod(token, periodCardId, periodMonth, { closingOn, dueOn })
            .then(() => {
              closePeriod();
              reload();
            })
            .catch((cause: unknown) => setError(toErrorMessage(cause)))
            .finally(() => setBusy(false));
        }}
        submitLabel="Guardar"
        title={`Periodo${periodCard === undefined ? "" : ` · ${periodCard.name}`}`}
        visible={periodOpen}
      >
        <MonthStepper onChange={setPeriodMonth} value={periodMonth} />
        <DateField label="Fecha de cierre" onChange={setClosingOn} value={closingOn} />
        <DateField label="Fecha de vencimiento" onChange={setDueOn} value={dueOn} />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  totals: {
    gap: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  alertTitle: {
    fontWeight: "700",
    color: colors.pending,
  },
  alertText: {
    color: colors.ink,
  },
});
