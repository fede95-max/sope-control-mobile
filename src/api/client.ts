import { apiBaseUrl } from "../config";
import { isRecord } from "./json";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(options: { status: number; code: string; message: string }) {
    super(options.message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.code = options.code;
  }
}

function readError(payload: unknown, status: number): { code: string; message: string } {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return { code: "INTERNAL_ERROR", message: `Request failed (${status})` };
  }
  const code = payload.error.code;
  const message = payload.error.message;
  return {
    code: typeof code === "string" ? code : "INTERNAL_ERROR",
    message: typeof message === "string" ? message : `Request failed (${status})`,
  };
}

function headers(token: string | undefined, json: boolean): Record<string, string> {
  const result: Record<string, string> = {};
  if (token !== undefined) {
    result.Authorization = `Bearer ${token}`;
  }
  if (json) {
    result["Content-Type"] = "application/json";
  }
  return result;
}

export async function apiRequest<T>(input: {
  path: string;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string;
  body?: Record<string, unknown>;
  parseJson: (value: unknown) => T;
}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${input.path}`, {
    method: input.method ?? "GET",
    headers: headers(input.token, input.body !== undefined),
    ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text === "" ? undefined : JSON.parse(text);
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const error = readError(payload, response.status);
    throw new ApiRequestError({
      status: response.status,
      code: error.code,
      message: error.message,
    });
  }

  return input.parseJson(payload);
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunk) {
    const slice = bytes.subarray(index, index + chunk);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export async function apiDownload(input: {
  path: string;
  token: string;
}): Promise<{ base64: string; fileName: string }> {
  const response = await fetch(`${apiBaseUrl}${input.path}`, {
    headers: headers(input.token, false),
  });

  if (!response.ok) {
    const text = await response.text();
    let payload: unknown;
    try {
      payload = text === "" ? undefined : JSON.parse(text);
    } catch {
      payload = undefined;
    }
    const error = readError(payload, response.status);
    throw new ApiRequestError({
      status: response.status,
      code: error.code,
      message: error.message,
    });
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const buffer = await response.arrayBuffer();
  return {
    base64: bytesToBase64(new Uint8Array(buffer)),
    fileName: match?.[1] ?? "sope-control.xlsx",
  };
}
