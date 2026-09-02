import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatYearMonth, shiftYearMonth } from "../money";
import { colors, space } from "../theme";

export function MonthStepper({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable onPress={() => onChange(shiftYearMonth(value, -1))} style={styles.stepButton}>
        <Text style={styles.stepText}>‹</Text>
      </Pressable>
      <Text style={styles.monthLabel}>{formatYearMonth(value)}</Text>
      <Pressable onPress={() => onChange(shiftYearMonth(value, 1))} style={styles.stepButton}>
        <Text style={styles.stepText}>›</Text>
      </Pressable>
    </View>
  );
}

export function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <TextInput
      onChangeText={onChange}
      placeholder="Buscar..."
      placeholderTextColor={colors.muted}
      style={styles.search}
      value={value}
    />
  );
}

export function FilterRow({ children }: { children: ReactNode }) {
  return <View style={styles.filters}>{children}</View>;
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : undefined]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : undefined]}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.primary, disabled ? styles.disabled : undefined]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.ghost}>
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepText: {
    fontSize: 22,
    color: colors.teal,
    fontWeight: "600",
  },
  monthLabel: {
    minWidth: 140,
    textAlign: "center",
    textTransform: "capitalize",
    fontWeight: "600",
    color: colors.ink,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.teal,
  },
  primary: {
    backgroundColor: colors.teal,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
  ghost: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  ghostText: {
    color: colors.teal,
    fontWeight: "700",
  },
});
