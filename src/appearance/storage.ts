import * as SecureStore from "expo-secure-store";
import { DEFAULT_BACKGROUND_COLOR } from "./constants";

const STORAGE_KEY = "sope-control.backgroundColor";
const memory = new Map<string, string>();
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidBackgroundColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

export async function readStoredBackgroundColor(): Promise<string | undefined> {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY);
    if (value === null || value === "" || !isValidBackgroundColor(value)) {
      return undefined;
    }
    return value.toLowerCase();
  } catch {
    const value = memory.get(STORAGE_KEY);
    if (value === undefined || !isValidBackgroundColor(value)) {
      return undefined;
    }
    return value.toLowerCase();
  }
}

export async function writeStoredBackgroundColor(color: string): Promise<void> {
  if (!isValidBackgroundColor(color)) {
    return;
  }
  const normalized = color.toLowerCase();
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, normalized);
  } catch {
    memory.set(STORAGE_KEY, normalized);
  }
}

export async function clearStoredBackgroundColor(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch {
    memory.delete(STORAGE_KEY);
  }
}

export { DEFAULT_BACKGROUND_COLOR };
