import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import type { MoreStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { SelectField } from "../ui/fields";
import { Card, Row } from "../ui/list";
import { Screen, screenContentStyle } from "../ui/primitives";

const links: Array<{
  key: "MassImports" | "Categories" | "Budgets" | "Recurring" | "Household" | "Groups" | "Users";
  title: string;
  subtitle: string;
  permission: string;
}> = [
  { key: "MassImports", title: "Movimientos masivos", subtitle: "Importar desde imagen o PDF", permission: "mass-imports:read" },
  { key: "Categories", title: "Categorías", subtitle: "Ingresos, egresos y ambos", permission: "categories:read" },
  { key: "Budgets", title: "Presupuestos", subtitle: "Límite mensual por categoría", permission: "budgets:read" },
  { key: "Recurring", title: "Recurrentes", subtitle: "Cobros y pagos que se repiten", permission: "recurring:read" },
  { key: "Household", title: "Hogar", subtitle: "Miembros e invitaciones", permission: "household:read" },
  { key: "Groups", title: "Grupos y permisos", subtitle: "Visibilidad y acciones por grupo", permission: "groups:read" },
  { key: "Users", title: "Usuarios", subtitle: "Todos los usuarios y hogares asociados", permission: "users:read" },
];

export function MoreScreen() {
  const auth = useAuth();
  const { can } = usePermissions();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const households = auth.me?.households ?? [];

  return (
    <Screen title="Más">
      <ScrollView contentContainerStyle={screenContentStyle}>
        <Text style={styles.email}>{auth.me?.user.email}</Text>
        {households.length > 1 ? (
          <SelectField
            label="Hogar activo"
            onChange={(householdId) => {
              void auth.switchHousehold(householdId);
            }}
            options={households.map((household) => ({ value: household.id, label: household.label }))}
            value={auth.me?.user.householdId ?? ""}
          />
        ) : null}
        {links
          .filter((link) => can(link.permission))
          .map((link) => (
          <Card key={link.key} onPress={() => navigation.navigate(link.key)}>
            <Row subtitle={link.subtitle} title={link.title} />
          </Card>
        ))}
        <Card onPress={auth.logout}>
          <Row subtitle="Salís de esta sesión en el teléfono" title="Cerrar sesión" />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  email: {
    color: colors.muted,
    fontSize: 14,
  },
});
