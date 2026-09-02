export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new Error(`Invalid ${field} in API response`);
  }
  return value;
}

export function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Invalid ${field} in API response`);
  }
  return value;
}

export function readBoolean(record: Record<string, unknown>, field: string): boolean {
  const value = record[field];
  if (typeof value !== "boolean") {
    throw new Error(`Invalid ${field} in API response`);
  }
  return value;
}

export function readNullableString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Invalid ${field} in API response`);
  }
  return value;
}

export function readNullableNumber(record: Record<string, unknown>, field: string): number | undefined {
  const value = record[field];
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`Invalid ${field} in API response`);
  }
  return value;
}

export function readArray(record: Record<string, unknown>, field: string): unknown[] {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${field} in API response`);
  }
  return value;
}
