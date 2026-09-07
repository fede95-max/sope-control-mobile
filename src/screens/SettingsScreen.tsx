import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppearance } from "../appearance/AppearanceContext";
import { BACKGROUND_COLOR_PRESETS, DEFAULT_BACKGROUND_COLOR } from "../appearance/constants";
import { colors, space } from "../theme";
import { Card } from "../ui/list";
import { Screen, screenContentStyle } from "../ui/primitives";

export function SettingsScreen() {
  const appearance = useAppearance();

  return (
    <Screen title="Preferencias">
      <ScrollView contentContainerStyle={screenContentStyle}>
        <Card>
          <Text style={styles.lead}>
            Elegí el color de fondo de la app. Se guarda en este dispositivo y se aplica también en el login.
          </Text>
          <View style={styles.presets}>
            {BACKGROUND_COLOR_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                accessibilityLabel={`Color ${preset}`}
                onPress={() => {
                  void appearance.setBackgroundColor(preset);
                }}
                style={[
                  styles.preset,
                  { backgroundColor: preset },
                  appearance.backgroundColor === preset ? styles.presetActive : undefined,
                ]}
              />
            ))}
          </View>
          <View style={[styles.preview, { backgroundColor: appearance.backgroundColor }]}>
            <Text style={styles.previewText}>Vista previa del fondo</Text>
          </View>
          <Text style={styles.hex}>{appearance.backgroundColor}</Text>
          <Pressable
            disabled={appearance.backgroundColor === DEFAULT_BACKGROUND_COLOR}
            onPress={() => {
              void appearance.resetBackgroundColor();
            }}
            style={styles.reset}
          >
            <Text style={styles.resetText}>Restablecer color predeterminado</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  preset: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.line,
  },
  presetActive: {
    borderColor: colors.teal,
  },
  preview: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
  },
  previewText: {
    color: colors.ink,
    fontWeight: "600",
  },
  hex: {
    color: colors.muted,
    fontSize: 13,
  },
  reset: {
    alignItems: "center",
    paddingVertical: space.sm,
  },
  resetText: {
    color: colors.teal,
    fontWeight: "600",
  },
});
