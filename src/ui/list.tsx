import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, space } from "../theme";

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  if (onPress === undefined) {
    return <View style={styles.card}>{children}</View>;
  }
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {children}
    </Pressable>
  );
}

export function Row({
  title,
  subtitle,
  meta,
  right,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle !== undefined && subtitle !== "" ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        {meta !== undefined && meta !== "" ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Amount({ value, currency }: { value: string; currency?: string }) {
  return (
    <Text style={styles.amount}>
      {value}
      {currency === undefined ? "" : ` ${currency}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: space.md,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },
  rowSubtitle: {
    fontSize: 13,
    color: colors.muted,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.muted,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
});
