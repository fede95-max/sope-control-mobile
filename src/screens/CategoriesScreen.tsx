import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../api/sope";
import type { Category } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { categoryKindLabel } from "../labels";
import { CategoryChip, CATEGORY_COLOR_PRESETS } from "../ui/CategoryChip";
import { Chip, FilterRow, GhostButton, SearchBar } from "../ui/controls";
import { colors, space } from "../theme";
import { SelectField, TextField } from "../ui/fields";
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

export function CategoriesScreen() {
  const token = useAuth().token;
  const { can } = usePermissions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("EXPENSE");
  const [color, setColor] = useState("#64748b");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("");

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void listCategories(token)
      .then(setCategories)
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    reload();
  }, [token]);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      if (kindFilter !== "" && category.kind !== kindFilter) {
        return false;
      }
      return matchesText([category.name, categoryKindLabel(category.kind), category.seedCode], query);
    });
  }, [categories, query, kindFilter]);
  const dirty = useFormDirty(formOpen, [name, kind, color]);

  function resetForm() {
    setEditingId(undefined);
    setName("");
    setKind("EXPENSE");
    setColor("#64748b");
    setFormOpen(false);
  }

  return (
    <Screen
      title="Categorías"
      actions={
        can("categories:write") ? (
          <GhostButton
            label="Nueva"
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
        <SearchBar onChange={setQuery} value={query} />
        <FilterRow>
          <Chip active={kindFilter === ""} label="Todas" onPress={() => setKindFilter("")} />
          <Chip active={kindFilter === "EXPENSE"} label="Egreso" onPress={() => setKindFilter("EXPENSE")} />
          <Chip active={kindFilter === "INCOME"} label="Ingreso" onPress={() => setKindFilter("INCOME")} />
          <Chip active={kindFilter === "BOTH"} label="Ambos" onPress={() => setKindFilter("BOTH")} />
        </FilterRow>
        <ErrorBanner error={error} />
        {filteredCategories.length === 0 ? (
          <EmptyState text="No hay categorías." />
        ) : (
          filteredCategories.map((category) => (
            <Card
              key={category.id}
              onPress={() => {
                setEditingId(category.id);
                setName(category.name);
                setKind(category.kind);
                setColor(category.color || "#64748b");
                setError(undefined);
                setFormOpen(true);
              }}
            >
              <Row
                subtitle={categoryKindLabel(category.kind)}
                meta={category.seedCode}
                title={category.name}
              />
              <CategoryChip name={category.name} color={category.color} />
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
          editingId === undefined || token === undefined || !can("categories:delete")
            ? undefined
            : () => {
                void confirmAction("Eliminar categoría", "¿Eliminar esta categoría?", "Eliminar").then((ok) => {
                  if (!ok || token === undefined || editingId === undefined) {
                    return;
                  }
                  setBusy(true);
                  void deleteCategory(token, editingId)
                    .then(() => {
                      setCategories((current) => current.filter((category) => category.id !== editingId));
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
          const body = { name: name.trim(), kind, color };
          if (editingId === undefined) {
            void createCategory(token, body)
              .then((category) => {
                setCategories((current) => [...current, category]);
                resetForm();
                setError(undefined);
              })
              .catch((cause: unknown) => setError(toErrorMessage(cause)))
              .finally(() => setBusy(false));
          } else {
            void updateCategory(token, editingId, body)
              .then((category) => {
                setCategories((current) => current.map((item) => (item.id === category.id ? category : item)));
                resetForm();
                setError(undefined);
              })
              .catch((cause: unknown) => setError(toErrorMessage(cause)))
              .finally(() => setBusy(false));
          }
        }}
        submitLabel={editingId === undefined ? "Crear" : "Guardar"}
        title={editingId === undefined ? "Nueva categoría" : "Editar categoría"}
        visible={formOpen}
      >
        <TextField label="Nombre" onChangeText={setName} value={name} />
        <SelectField
          label="Tipo"
          onChange={setKind}
          options={[
            { value: "EXPENSE", label: "Egreso" },
            { value: "INCOME", label: "Ingreso" },
            { value: "BOTH", label: "Ambos" },
          ]}
          value={kind}
        />
        <View style={styles.colorBlock}>
          <CategoryChip name={name.trim() === "" ? "Categoría" : name.trim()} color={color} />
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
