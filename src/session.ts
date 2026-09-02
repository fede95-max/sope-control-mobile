import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "sope-control.accessToken";
const memory = new Map<string, string>();

export async function readAccessToken(): Promise<string | undefined> {
  try {
    const value = await SecureStore.getItemAsync(TOKEN_KEY);
    return value === null ? undefined : value;
  } catch {
    return memory.get(TOKEN_KEY);
  }
}

export async function writeAccessToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    memory.set(TOKEN_KEY, token);
  }
}

export async function clearAccessToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    memory.delete(TOKEN_KEY);
  }
}
