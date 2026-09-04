import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useAuth } from "../auth/AuthContext";
import type { MoreStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { Card, Row } from "../ui/list";
import { Screen, screenContentStyle } from "../ui/primitives";

const links: Array<{ key: keyof MoreStackParamList; title: string; subtitle: string }> = [
  { key: "Categories", title: "Categorías", subtitle: "Ingresos, egresos y ambos" },
  { key: "Budgets", title: "Presupuestos", subtitle: "Límite mensual por categoría" },
  { key: "Recurring", title: "Recurrentes", subtitle: "Cobros y pagos que se repiten" },
  { key: "Household", title: "Hogar", subtitle: "Miembros e invitaciones" },
];

export function MoreScreen() {
  const auth = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();

  return (
    <Screen title="Más">
      <ScrollView contentContainerStyle={screenContentStyle}>
        <Text style={styles.email}>{auth.me?.user.email}</Text>
        {links.map((link) => (
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
