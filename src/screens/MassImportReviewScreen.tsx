import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  cancelMassImport,
  confirmMassImport,
  getMassImport,
  getMassImportFileDownload,
  listAccounts,
  listCards,
  listCategories,
  updateMassImportDraft,
} from "../api/sope";
import type { Account, Card, Category, MassImport, MassImportDraftItem, TransactionStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import type { MoreStackParamList } from "../navigation/types";
import {
  currentCalendarDate,
  formatAmountFromMinor,
  formatCalendarDate,
  parseAmountToMinor,
} from "../money";
import { colors, space } from "../theme";
import { Chip, FilterRow, GhostButton, PrimaryButton } from "../ui/controls";
import { DateField, SelectField, TextField } from "../ui/fields";
import { Amount, Card as ListCard, Row } from "../ui/list";
import {
  EmptyState,
  ErrorBanner,
  FormSheet,
  Screen,
  confirmAction,
  screenContentStyle,
  toErrorMessage,
  useFormDirty,
} from "../ui/primitives";

function emptyManualItem(timezone: string, currency: string): MassImportDraftItem {
  const today = currentCalendarDate(timezone);
  return {
    clientId: crypto.randomUUID(),
    selected: true,
    source: "MANUAL",
    type: "EXPENSE",
    status: "APPROVED",
    amountMinor: 0,
    currency,
    description: undefined,
    occurredOn: today,
    approvedOn: today,
    categoryId: undefined,
    installmentCount: undefined,
    installmentNumber: undefined,
  };
}

export function MassImportReviewScreen() {
  const auth = useAuth();
  const { can } = usePermissions();
  const token = auth.token;
  const timezone = auth.me?.user.timezone ?? "America/Argentina/Buenos_Aires";
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const route = useRoute<RouteProp<MoreStackParamList, "MassImportReview">>();
  const id = route.params.id;
  const [massImport, setMassImport] = useState<MassImport | undefined>(undefined);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draftItems, setDraftItems] = useState<MassImportDraftItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [status, setStatus] = useState<TransactionStatus>("APPROVED");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [occurredOn, setOccurredOn] = useState("");
  const [approvedOn, setApprovedOn] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [installmentCount, setInstallmentCount] = useState("");

  useEffect(() => {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void Promise.all([
      getMassImport(token, id),
      listAccounts(token, true),
      listCards(token, true),
      listCategories(token),
    ])
      .then(([nextImport, nextAccounts, nextCards, nextCategories]) => {
        setMassImport(nextImport);
        setDraftItems(nextImport.draftItems);
        setAccounts(nextAccounts);
        setCards(nextCards);
        setCategories(nextCategories);
        setActiveFileId(nextImport.files[0]?.id);
        setError(undefined);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }, [token, id]);

  useEffect(() => {
    if (token === undefined || activeFileId === undefined) {
      return;
    }
    let cancelled = false;
    void getMassImportFileDownload(token, id, activeFileId)
      .then((result) => {
        if (!cancelled) {
          setPreviewUrl(result.downloadUrl);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(toErrorMessage(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, id, activeFileId]);

  const readonly = massImport !== undefined && (massImport.status !== "DRAFT" || !can("mass-imports:write"));
  const targetCurrency =
    massImport?.cardId !== undefined
      ? cards.find((card) => card.id === massImport.cardId)?.currency ?? "ARS"
      : accounts.find((account) => account.id === massImport?.accountId)?.currency ?? "ARS";
  const targetName =
    massImport?.cardId !== undefined
      ? cards.find((card) => card.id === massImport.cardId)?.name ?? "Tarjeta"
      : accounts.find((account) => account.id === massImport?.accountId)?.name ?? "Cuenta";
  const formOpen = editingId !== undefined;
  const dirty = useFormDirty(formOpen, [type, status, amount, currency, occurredOn, approvedOn, description, categoryId, installmentCount]);
  const filteredCategories = categories.filter((category) => {
    if (type === "INCOME") {
      return category.kind === "INCOME" || category.kind === "BOTH";
    }
    return category.kind === "EXPENSE" || category.kind === "BOTH";
  });
  const selectedCount = draftItems.filter((item) => item.selected).length;
  const activeFile = massImport?.files.find((file) => file.id === activeFileId);
  const confirmBlocked = useMemo(() => {
    return draftItems.some((item) => {
      if (!item.selected) {
        return false;
      }
      return item.categoryId === undefined || item.amountMinor < 1 || item.occurredOn === "" || item.currency !== targetCurrency;
    });
  }, [draftItems, targetCurrency]);

  function startEdit(item: MassImportDraftItem) {
    setEditingId(item.clientId);
    setType(item.type);
    setStatus(item.status);
    setAmount(item.amountMinor > 0 ? formatAmountFromMinor(item.amountMinor) : "");
    setCurrency(item.currency === "" ? targetCurrency : item.currency);
    setOccurredOn(item.occurredOn);
    setApprovedOn(item.approvedOn);
    setDescription(item.description ?? "");
    setCategoryId(item.categoryId ?? "");
    setInstallmentCount(item.installmentCount === undefined ? "" : String(item.installmentCount));
    setError(undefined);
  }

  function applyEdit() {
    if (editingId === undefined) {
      return;
    }
    let amountMinor = 0;
    try {
      amountMinor = amount.trim() === "" ? 0 : parseAmountToMinor(amount);
    } catch (cause: unknown) {
      setError(toErrorMessage(cause));
      return;
    }
    setDraftItems((current) =>
      current.map((item) =>
        item.clientId === editingId
          ? {
              ...item,
              type,
              status,
              amountMinor,
              currency,
              occurredOn,
              approvedOn: approvedOn === "" ? occurredOn : approvedOn,
              description: description.trim() === "" ? undefined : description.trim(),
              categoryId: categoryId === "" ? undefined : categoryId,
              installmentCount: installmentCount.trim() === "" ? undefined : Number(installmentCount),
            }
          : item,
      ),
    );
    setEditingId(undefined);
  }

  function persistDraft(nextItems: MassImportDraftItem[]): Promise<void> {
    if (token === undefined) {
      return Promise.resolve();
    }
    return updateMassImportDraft(token, id, nextItems).then((updated) => {
      setMassImport(updated);
      setDraftItems(updated.draftItems);
    });
  }

  return (
    <Screen title="Revisión masiva">
      <ScrollView contentContainerStyle={screenContentStyle}>
        <ErrorBanner error={error} />
        <Text style={styles.meta}>
          {targetName} · {targetCurrency} · {massImport?.status ?? ""}
        </Text>
        <FilterRow>
          {massImport?.files.map((file) => (
            <Chip
              key={file.id}
              active={file.id === activeFileId}
              label={file.originalFileName}
              onPress={() => setActiveFileId(file.id)}
            />
          ))}
        </FilterRow>
        {previewUrl !== undefined && activeFile?.contentType !== "application/pdf" ? (
          <Image resizeMode="contain" source={{ uri: previewUrl }} style={styles.preview} />
        ) : null}
        {previewUrl !== undefined ? (
          <GhostButton label="Ver / descargar original" onPress={() => void Linking.openURL(previewUrl)} />
        ) : null}
        {readonly ? null : (
          <>
            <GhostButton label="Seleccionar todo" onPress={() => setDraftItems((current) => current.map((item) => ({ ...item, selected: true })))} />
            <GhostButton label="Deseleccionar todo" onPress={() => setDraftItems((current) => current.map((item) => ({ ...item, selected: false })))} />
            <GhostButton
              label="Agregar fila"
              onPress={() => {
                const created = emptyManualItem(timezone, targetCurrency);
                setDraftItems((current) => [...current, created]);
                startEdit(created);
              }}
            />
          </>
        )}
        {draftItems.length === 0 ? (
          <EmptyState text="No hay movimientos en este lote." />
        ) : (
          draftItems.map((item) => (
            <ListCard key={item.clientId} onPress={() => startEdit(item)}>
              <Row
                meta={categories.find((category) => category.id === item.categoryId)?.name ?? "Sin categoría"}
                right={<Amount currency={item.currency || targetCurrency} value={item.amountMinor > 0 ? formatAmountFromMinor(item.amountMinor) : "—"} />}
                subtitle={`${formatCalendarDate(item.occurredOn) || "sin fecha"} · ${item.type === "INCOME" ? "Ingreso" : "Egreso"}`}
                title={item.description ?? "(sin nombre)"}
              />
              {readonly ? null : (
                <Pressable
                  onPress={() =>
                    setDraftItems((current) =>
                      current.map((entry) => (entry.clientId === item.clientId ? { ...entry, selected: !entry.selected } : entry)),
                    )
                  }
                  style={styles.checkRow}
                >
                  <Text style={styles.check}>{item.selected ? "Seleccionado" : "No guardar"}</Text>
                </Pressable>
              )}
            </ListCard>
          ))
        )}
        {readonly ? null : (
          <View style={styles.actions}>
            <PrimaryButton
              disabled={busy}
              label="Guardar borrador"
              onPress={() => {
                setBusy(true);
                void persistDraft(draftItems)
                  .then(() => setError(undefined))
                  .catch((cause: unknown) => setError(toErrorMessage(cause)))
                  .finally(() => setBusy(false));
              }}
            />
            {can("mass-imports:confirm") ? (
            <PrimaryButton
              disabled={busy || selectedCount === 0 || confirmBlocked}
              label={`Confirmar (${selectedCount})`}
              onPress={() => {
                if (token === undefined) {
                  return;
                }
                setBusy(true);
                void persistDraft(draftItems)
                  .then(() => confirmMassImport(token, id, draftItems))
                  .then(() => navigation.navigate("MassImports"))
                  .catch((cause: unknown) => setError(toErrorMessage(cause)))
                  .finally(() => setBusy(false));
              }}
            />
            ) : null}
            <GhostButton
              label="Cancelar lote"
              onPress={() => {
                if (token === undefined) {
                  return;
                }
                void confirmAction("Cancelar lote", "El borrador quedará cancelado.", "Cancelar lote").then((ok) => {
                  if (!ok) {
                    return;
                  }
                  setBusy(true);
                  void cancelMassImport(token, id)
                    .then(() => navigation.navigate("MassImports"))
                    .catch((cause: unknown) => setError(toErrorMessage(cause)))
                    .finally(() => setBusy(false));
                });
              }}
            />
            {confirmBlocked ? (
              <Text style={styles.hint}>
                Cada seleccionado necesita categoría, monto, fecha y moneda {targetCurrency}.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
      <FormSheet
        busy={busy}
        dirty={dirty}
        error={error}
        onClose={() => setEditingId(undefined)}
        onSubmit={() => {
          if (readonly) {
            setEditingId(undefined);
            return;
          }
          applyEdit();
        }}
        submitLabel={readonly ? "Cerrar" : "Aplicar"}
        title="Editar movimiento"
        visible={formOpen}
      >
        <SelectField
          disabled={readonly}
          label="Tipo"
          onChange={(next) => setType(next as "INCOME" | "EXPENSE")}
          options={[
            { value: "EXPENSE", label: "Egreso" },
            { value: "INCOME", label: "Ingreso" },
          ]}
          value={type}
        />
        <SelectField
          disabled={readonly}
          label="Estado"
          onChange={(next) => setStatus(next as TransactionStatus)}
          options={[
            { value: "APPROVED", label: "Aprobado" },
            { value: "PENDING", label: "Pendiente" },
          ]}
          value={status}
        />
        <TextField editable={!readonly} keyboardType="decimal-pad" label="Monto" onChangeText={setAmount} value={amount} />
        <SelectField
          disabled={readonly}
          label="Moneda"
          onChange={setCurrency}
          options={[
            { value: "ARS", label: "ARS" },
            { value: "USD", label: "USD" },
          ]}
          value={currency}
        />
        <DateField label="Fecha de compra" onChange={setOccurredOn} value={occurredOn} />
        <DateField label="Acreditación" onChange={setApprovedOn} value={approvedOn} />
        <TextField editable={!readonly} label="Descripción" onChangeText={setDescription} value={description} />
        <SelectField
          disabled={readonly}
          label="Categoría"
          onChange={setCategoryId}
          options={[
            { value: "", label: "Sin categoría" },
            ...filteredCategories.map((category) => ({ value: category.id, label: category.name })),
          ]}
          value={categoryId}
        />
        <TextField editable={!readonly} keyboardType="numeric" label="Cuotas (opcional)" onChangeText={setInstallmentCount} value={installmentCount} />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  preview: {
    width: "100%",
    height: 220,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  checkRow: {
    marginTop: space.xs,
  },
  check: {
    color: colors.teal,
    fontWeight: "600",
  },
  actions: {
    gap: space.sm,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
  },
});
