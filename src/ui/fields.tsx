import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { formatCalendarDate, parseCalendarDate, toCalendarDate } from "../money";
import { colors, space } from "../theme";

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "decimal-pad";
  editable?: boolean;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, editable ? undefined : styles.inputDisabled]}
        value={value}
      />
    </View>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Elegí una opción",
  disabled = false,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable disabled={disabled} onPress={() => setOpen(true)} style={[styles.input, styles.select, disabled ? styles.inputDisabled : undefined]}>
        <Text style={selected === undefined ? styles.placeholder : styles.selectText}>
          {selected?.label ?? placeholder}
        </Text>
      </Pressable>
      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <Pressable onPress={() => setOpen(false)} style={styles.overlay}>
          <View style={styles.sheet}>
            {options.map((option) => (
              <Pressable
                key={option.value === "" ? `empty-${option.label}` : option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={styles.option}
              >
                <Text style={[styles.optionText, option.value === value ? styles.optionSelected : undefined]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const date = value === "" ? new Date() : parseCalendarDate(value);

  function onPick(_event: DateTimePickerEvent, next?: Date) {
    if (Platform.OS === "android") {
      setOpen(false);
    }
    if (next !== undefined) {
      onChange(toCalendarDate(next));
    }
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[styles.input, styles.select]}>
        <Text style={value === "" ? styles.placeholder : styles.selectText}>
          {value === "" ? "Elegí una fecha" : formatCalendarDate(value)}
        </Text>
      </Pressable>
      {open && Platform.OS === "android" ? (
        <DateTimePicker display="default" mode="date" onChange={onPick} value={date} />
      ) : null}
      {Platform.OS === "ios" ? (
        <Modal animationType="slide" onRequestClose={() => setOpen(false)} transparent visible={open}>
          <Pressable onPress={() => setOpen(false)} style={styles.overlay}>
            <View style={styles.iosPicker}>
              <Pressable onPress={() => setOpen(false)} style={styles.doneRow}>
                <Text style={styles.done}>Listo</Text>
              </Pressable>
              <DateTimePicker display="spinner" mode="date" onChange={onPick} value={date} />
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  select: {
    justifyContent: "center",
  },
  selectText: {
    fontSize: 16,
    color: colors.ink,
  },
  placeholder: {
    fontSize: 16,
    color: colors.muted,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: space.sm,
    maxHeight: "70%",
  },
  option: {
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 16,
    color: colors.ink,
  },
  optionSelected: {
    color: colors.teal,
    fontWeight: "700",
  },
  iosPicker: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: space.lg,
  },
  doneRow: {
    alignItems: "flex-end",
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  done: {
    color: colors.teal,
    fontWeight: "700",
    fontSize: 16,
  },
});
