import { StyleSheet, Text, View } from "react-native";
import type { HouseholdMember } from "../api/types";
import { colors, space } from "../theme";

export type AuditFields = {
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
};

function formatAuditDateTime(value: string | undefined): string {
  if (value === undefined || value === "") {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function resolveUserLabel(userId: string | undefined, members: HouseholdMember[]): string {
  if (userId === undefined || userId === "") {
    return "Usuario desconocido";
  }
  return members.find((member) => member.userId === userId)?.email ?? "Usuario desconocido";
}

export function AuditFooter({
  audit,
  members,
}: {
  audit: AuditFields | undefined;
  members: HouseholdMember[];
}) {
  if (audit === undefined) {
    return null;
  }

  const createdAt = formatAuditDateTime(audit.createdAt);
  const updatedAt = formatAuditDateTime(audit.updatedAt);
  const createdBy = resolveUserLabel(audit.createdByUserId, members);
  const updatedBy = resolveUserLabel(audit.updatedByUserId, members);
  const showUpdated =
    audit.updatedByUserId !== undefined ||
    (audit.updatedAt !== undefined && audit.updatedAt !== audit.createdAt);

  return (
    <View style={styles.block}>
      <Text style={styles.text}>
        {createdAt === "" ? `Creado por ${createdBy}` : `Creado por ${createdBy} · ${createdAt}`}
      </Text>
      {showUpdated ? (
        <Text style={styles.text}>
          {updatedAt === ""
            ? `Última edición por ${updatedBy}`
            : `Última edición por ${updatedBy} · ${updatedAt}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 4,
    paddingTop: space.xs,
  },
  text: {
    fontSize: 12,
    color: colors.muted,
  },
});
