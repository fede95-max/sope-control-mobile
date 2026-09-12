import { StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";

export function ListTotalsBar({ text, lines }: { text?: string; lines?: string[] }) {
  const items = lines ?? (text === undefined ? [] : [text]);
  return (
    <View style={styles.bar}>
      {items.map((line) => (
        <Text key={line} style={styles.text}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: space.sm,
  },
  text: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
});
