import { useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  createGroup,
  deleteGroup,
  listGroups,
  listPermissions,
  updateGroup,
} from "../api/sope";
import type { PermissionDefinition, UserGroup } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { colors, space } from "../theme";
import { GhostButton, SearchBar } from "../ui/controls";
import { TextField } from "../ui/fields";
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

export function GroupsScreen() {
  const token = useAuth().token;
  const { can } = usePermissions();
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");

  function reload() {
    if (token === undefined) {
      return;
    }
    setBusy(true);
    void Promise.all([listGroups(token), listPermissions(token)])
      .then(([nextGroups, nextCatalog]) => {
        setGroups(nextGroups);
        setCatalog(nextCatalog);
        setError(undefined);
      })
      .catch((cause: unknown) => setError(toErrorMessage(cause)))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    reload();
  }, [token]);

  const filtered = useMemo(() => {
    return groups.filter((group) =>
      matchesText([group.name, group.isSystem ? "sistema" : "personalizado"], query),
    );
  }, [groups, query]);
  const editing = groups.find((group) => group.id === editingId);
  const dirty = useFormDirty(formOpen, [name, selected.join(",")]);
  const resources = useMemo(() => {
    const names: string[] = [];
    for (const item of catalog) {
      if (!names.includes(item.resource)) {
        names.push(item.resource);
      }
    }
    return names;
  }, [catalog]);

  function resetForm() {
    setEditingId(undefined);
    setName("");
    setSelected([]);
    setFormOpen(false);
  }

  function togglePermission(permission: string) {
    setSelected((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
  }

  return (
    <Screen
      title="Grupos y permisos"
      actions={
        can("groups:write") ? (
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
        <SearchBar onChange={setQuery} value={query} />
        <ErrorBanner error={error} />
        {filtered.length === 0 ? (
          <EmptyState text="No hay grupos." />
        ) : (
          filtered.map((group) => (
            <Card
              key={group.id}
              onPress={
                can("groups:write")
                  ? () => {
                      setEditingId(group.id);
                      setName(group.name);
                      setSelected(group.permissions);
                      setError(undefined);
                      setFormOpen(true);
                    }
                  : undefined
              }
            >
              <Row
                meta={`${group.permissions.length} permisos`}
                subtitle={group.isSystem ? "Sistema" : "Personalizado"}
                title={group.name}
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
          editingId === undefined || token === undefined || editing?.isSystem || !can("groups:delete")
            ? undefined
            : () => {
                void confirmAction("Eliminar grupo", "¿Eliminar este grupo?", "Eliminar").then((ok) => {
                  if (!ok || token === undefined || editingId === undefined) {
                    return;
                  }
                  setBusy(true);
                  void deleteGroup(token, editingId)
                    .then(() => {
                      setGroups((current) => current.filter((group) => group.id !== editingId));
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
          const request =
            editingId === undefined
              ? createGroup(token, { name: name.trim(), permissions: selected })
              : updateGroup(token, editingId, {
                  ...(editing?.isSystem ? {} : { name: name.trim() }),
                  permissions: selected,
                });
          void request
            .then((group) => {
              setGroups((current) => {
                if (editingId === undefined) {
                  return [...current, group];
                }
                return current.map((item) => (item.id === group.id ? group : item));
              });
              resetForm();
              setError(undefined);
            })
            .catch((cause: unknown) => setError(toErrorMessage(cause)))
            .finally(() => setBusy(false));
        }}
        submitLabel={editingId === undefined ? "Crear" : "Guardar"}
        title={editingId === undefined ? "Nuevo grupo" : "Editar grupo"}
        visible={formOpen}
      >
        <TextField editable={editing?.isSystem !== true} label="Nombre" onChangeText={setName} value={name} />
        {resources.map((resource) => (
          <View key={resource} style={styles.resource}>
            <Text style={styles.resourceTitle}>{resource}</Text>
            {catalog
              .filter((item) => item.resource === resource)
              .map((item) => {
                const active = selected.includes(item.permission);
                return (
                  <Pressable
                    key={item.permission}
                    onPress={() => togglePermission(item.permission)}
                    style={styles.permissionRow}
                  >
                    <View style={[styles.box, active ? styles.boxActive : undefined]} />
                    <Text style={styles.permissionLabel}>{item.label}</Text>
                  </Pressable>
                );
              })}
          </View>
        ))}
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resource: {
    gap: 6,
  },
  resourceTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "capitalize",
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: 6,
  },
  box: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  boxActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  permissionLabel: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
  },
});
