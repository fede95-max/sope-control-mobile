import { cacheDirectory, EncodingType, writeAsStringAsync } from "expo-file-system/legacy";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import {
  isRecord,
  readArray,
  readBoolean,
  readNullableNumber,
  readNullableString,
  readNumber,
  readString,
} from "./json";
import { apiDownload, apiRequest } from "./client";
import type {
  Account,
  Budget,
  Card,
  CardOverview,
  CardPeriod,
  CardStatement,
  Category,
  Dashboard,
  MassImport,
  MassImportDraftItem,
  MassImportFile,
  MassImportUpload,
  MeResponse,
  PermissionDefinition,
  Recurring,
  Transaction,
  TransactionStatus,
  UserGroup,
} from "./types";

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function parseAccount(value: unknown): Account {
  const item = requireRecord(value, "account");
  return {
    id: readString(item, "id"),
    name: readString(item, "name"),
    type: readString(item, "type"),
    currency: readString(item, "currency"),
    isActive: readBoolean(item, "isActive"),
    balanceMinor: typeof item.balanceMinor === "number" ? readNumber(item, "balanceMinor") : 0,
  };
}

function parseCategory(value: unknown): Category {
  const item = requireRecord(value, "category");
  return {
    id: readString(item, "id"),
    name: readString(item, "name"),
    kind: readString(item, "kind"),
    color: typeof item.color === "string" && item.color !== "" ? item.color : "#94a3b8",
    seedCode: readNullableString(item, "seedCode"),
    isActive: readBoolean(item, "isActive"),
  };
}

function parseUserGroup(value: unknown): UserGroup {
  const item = requireRecord(value, "group");
  return {
    id: readString(item, "id"),
    name: readString(item, "name"),
    seedCode: readNullableString(item, "seedCode"),
    permissions: readArray(item, "permissions").flatMap((entry) => (typeof entry === "string" ? [entry] : [])),
    isSystem: readBoolean(item, "isSystem"),
  };
}

function parseTransactionStatus(value: unknown): TransactionStatus {
  if (value === "PENDING" || value === "APPROVED") {
    return value;
  }
  return "APPROVED";
}

function parseTransaction(value: unknown): Transaction {
  const item = requireRecord(value, "transaction");
  return {
    id: readString(item, "id"),
    type: readString(item, "type"),
    status: parseTransactionStatus(item.status),
    amountMinor: readNumber(item, "amountMinor"),
    currency: readString(item, "currency"),
    description: readNullableString(item, "description"),
    occurredOn: readString(item, "occurredOn"),
    approvedOn: readNullableString(item, "approvedOn"),
    categoryId: readNullableString(item, "categoryId"),
    accountId: readNullableString(item, "accountId"),
    fromAccountId: readNullableString(item, "fromAccountId"),
    toAccountId: readNullableString(item, "toAccountId"),
    cardId: readNullableString(item, "cardId"),
    statementYearMonth: readNullableString(item, "statementYearMonth"),
    installmentCount: readNullableNumber(item, "installmentCount"),
    installmentNumber: readNullableNumber(item, "installmentNumber"),
    massImportId: readNullableString(item, "massImportId"),
  };
}

function parseCard(value: unknown): Card {
  const item = requireRecord(value, "card");
  return {
    id: readString(item, "id"),
    name: readString(item, "name"),
    kind: readString(item, "kind"),
    brand: readString(item, "brand"),
    last4: readString(item, "last4"),
    currency: readString(item, "currency"),
    isActive: readBoolean(item, "isActive"),
    accountId: readNullableString(item, "accountId"),
    closingDay: readNullableNumber(item, "closingDay"),
    dueDay: readNullableNumber(item, "dueDay"),
  };
}

function parseCardPeriod(value: unknown): CardPeriod | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const item = requireRecord(value, "period");
  return {
    cardId: readString(item, "cardId"),
    yearMonth: readString(item, "yearMonth"),
    closingOn: readString(item, "closingOn"),
    dueOn: readString(item, "dueOn"),
  };
}

function parseTotalsByCurrency(
  value: unknown,
): Array<{ currency: string; purchaseTotalMinor: number }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    return [
      {
        currency: readString(entry, "currency"),
        purchaseTotalMinor: readNumber(entry, "purchaseTotalMinor"),
      },
    ];
  });
}

function parseCardOverview(value: unknown): CardOverview {
  const card = parseCard(value);
  const item = requireRecord(value, "cardOverview");
  return {
    ...card,
    period: parseCardPeriod(item.period),
    periodFrom: readNullableString(item, "periodFrom"),
    periodTo: readNullableString(item, "periodTo"),
    dueOn: readNullableString(item, "dueOn"),
    totalsByCurrency: parseTotalsByCurrency(item.totalsByCurrency),
  };
}

function parseRecurring(value: unknown): Recurring {
  const item = requireRecord(value, "recurring");
  return {
    id: readString(item, "id"),
    name: readString(item, "name"),
    type: readString(item, "type"),
    amountMinor: readNumber(item, "amountMinor"),
    currency: readString(item, "currency"),
    dayOfMonth: readNumber(item, "dayOfMonth"),
    startOn: readString(item, "startOn"),
    endOn: readNullableString(item, "endOn") ?? undefined,
    installmentCount: readNullableNumber(item, "installmentCount"),
    description: readNullableString(item, "description"),
    nextRunOn: readString(item, "nextRunOn"),
    isActive: readBoolean(item, "isActive"),
    categoryId: readNullableString(item, "categoryId"),
    accountId: readNullableString(item, "accountId"),
    cardId: readNullableString(item, "cardId"),
  };
}

function parseBudget(value: unknown): Budget {
  const item = requireRecord(value, "budget");
  return {
    id: readString(item, "id"),
    categoryId: readString(item, "categoryId"),
    yearMonth: readString(item, "yearMonth"),
    amountMinor: readNumber(item, "amountMinor"),
    currency: readString(item, "currency"),
    spentMinor: readNumber(item, "spentMinor"),
    remainingMinor: readNumber(item, "remainingMinor"),
    percentUsed: readNumber(item, "percentUsed"),
  };
}

export async function signup(email: string, password: string): Promise<void> {
  await apiRequest({
    path: "/auth/signup",
    method: "POST",
    body: { email, password },
    parseJson: () => undefined,
  });
}

export async function login(email: string, password: string): Promise<string> {
  return apiRequest({
    path: "/auth/login",
    method: "POST",
    body: { email, password },
    parseJson: (payload) => readString(requireRecord(payload, "login"), "accessToken"),
  });
}

export async function getMe(token: string): Promise<MeResponse> {
  return apiRequest({
    path: "/me",
    token,
    parseJson: (payload) => {
      const root = requireRecord(payload, "/me");
      const user = requireRecord(root.user, "user");
      const household = requireRecord(root.household, "household");
      return {
        user: {
          id: readString(user, "id"),
          email: readString(user, "email"),
          householdId: readString(user, "householdId"),
          timezone: readString(user, "timezone"),
          defaultCurrency: readString(user, "defaultCurrency"),
        },
        household: {
          id: readString(household, "id"),
          members: readArray(household, "members").flatMap((member) => {
            if (!isRecord(member)) {
              return [];
            }
            return [
              {
                userId: readString(member, "userId"),
                email: readString(member, "email"),
                groupId: readNullableString(member, "groupId"),
              },
            ];
          }),
          pendingInvites: readArray(household, "pendingInvites").flatMap((invite) => {
            if (!isRecord(invite)) {
              return [];
            }
            return [
              {
                email: readString(invite, "email"),
                groupId: readNullableString(invite, "groupId"),
              },
            ];
          }),
        },
        group: isRecord(root.group) ? parseUserGroup(root.group) : undefined,
        permissions: readArray(root, "permissions").flatMap((item) => (typeof item === "string" ? [item] : [])),
      };
    },
  });
}

export async function listAccounts(token: string, includeInactive = false): Promise<Account[]> {
  return apiRequest({
    path: includeInactive ? "/accounts?includeInactive=true" : "/accounts",
    token,
    parseJson: (payload) => readArray(requireRecord(payload, "accounts"), "accounts").map(parseAccount),
  });
}

export async function createAccount(
  token: string,
  body: { name: string; type: string; currency: string },
): Promise<Account> {
  return apiRequest({
    path: "/accounts",
    method: "POST",
    token,
    body,
    parseJson: (payload) => parseAccount(requireRecord(payload, "account").account),
  });
}

export async function updateAccount(
  token: string,
  id: string,
  body: Record<string, unknown>,
): Promise<Account> {
  return apiRequest({
    path: `/accounts/${id}`,
    method: "PATCH",
    token,
    body,
    parseJson: (payload) => parseAccount(requireRecord(payload, "account").account),
  });
}

export async function deleteAccount(token: string, id: string): Promise<void> {
  await apiRequest({
    path: `/accounts/${id}`,
    method: "DELETE",
    token,
    parseJson: () => undefined,
  });
}

export async function listCategories(token: string): Promise<Category[]> {
  return apiRequest({
    path: "/categories",
    token,
    parseJson: (payload) => readArray(requireRecord(payload, "categories"), "categories").map(parseCategory),
  });
}

export async function createCategory(
  token: string,
  body: { name: string; kind: string; color: string },
): Promise<Category> {
  return apiRequest({
    path: "/categories",
    method: "POST",
    token,
    body,
    parseJson: (payload) => parseCategory(requireRecord(payload, "category").category),
  });
}

export async function updateCategory(
  token: string,
  id: string,
  body: Record<string, unknown>,
): Promise<Category> {
  return apiRequest({
    path: `/categories/${id}`,
    method: "PATCH",
    token,
    body,
    parseJson: (payload) => parseCategory(requireRecord(payload, "category").category),
  });
}

export async function deleteCategory(token: string, id: string): Promise<void> {
  await apiRequest({
    path: `/categories/${id}`,
    method: "DELETE",
    token,
    parseJson: () => undefined,
  });
}

export async function listTransactions(token: string, month: string): Promise<Transaction[]> {
  return apiRequest({
    path: `/transactions?month=${month}`,
    token,
    parseJson: (payload) =>
      readArray(requireRecord(payload, "transactions"), "transactions").map(parseTransaction),
  });
}

export async function createTransaction(
  token: string,
  body: Record<string, unknown>,
): Promise<Transaction> {
  return apiRequest({
    path: "/transactions",
    method: "POST",
    token,
    body,
    parseJson: (payload) => parseTransaction(requireRecord(payload, "transaction").transaction),
  });
}

export async function updateTransaction(
  token: string,
  id: string,
  body: Record<string, unknown>,
): Promise<Transaction> {
  return apiRequest({
    path: `/transactions/${id}`,
    method: "PATCH",
    token,
    body,
    parseJson: (payload) => parseTransaction(requireRecord(payload, "transaction").transaction),
  });
}

export async function deleteTransaction(token: string, id: string): Promise<void> {
  await apiRequest({
    path: `/transactions/${id}`,
    method: "DELETE",
    token,
    parseJson: () => undefined,
  });
}

export async function getDashboard(token: string, month: string): Promise<Dashboard> {
  return apiRequest({
    path: `/dashboard?month=${month}`,
    token,
    parseJson: (payload) => {
      const root = requireRecord(payload, "dashboard");
      return {
        month: readString(root, "month"),
        totals: readArray(root, "totals").flatMap((item) => {
          if (!isRecord(item)) {
            return [];
          }
          return [
            {
              currency: readString(item, "currency"),
              accountsMinor: readNumber(item, "accountsMinor"),
              cardMovementsMinor: readNumber(item, "cardMovementsMinor"),
              balanceMinor: readNumber(item, "balanceMinor"),
            },
          ];
        }),
        expensesByCategory: readArray(root, "expensesByCategory").flatMap((item) => {
          if (!isRecord(item)) {
            return [];
          }
          return [
            {
              categoryId: readString(item, "categoryId"),
              amountMinor: readNumber(item, "amountMinor"),
              currency: readString(item, "currency"),
            },
          ];
        }),
      };
    },
  });
}

export async function listCards(token: string, includeInactive = false): Promise<Card[]> {
  return apiRequest({
    path: includeInactive ? "/cards?includeInactive=true" : "/cards",
    token,
    parseJson: (payload) => readArray(requireRecord(payload, "cards"), "cards").map(parseCard),
  });
}

export async function listCardOverview(token: string, month: string): Promise<CardOverview[]> {
  return apiRequest({
    path: `/cards?month=${month}`,
    token,
    parseJson: (payload) =>
      readArray(requireRecord(payload, "cards"), "cards").map(parseCardOverview),
  });
}

export async function upsertCardPeriod(
  token: string,
  cardId: string,
  month: string,
  body: { closingOn: string; dueOn: string },
): Promise<CardPeriod> {
  return apiRequest({
    path: `/cards/${cardId}/periods/${month}`,
    method: "PUT",
    token,
    body,
    parseJson: (payload) => {
      const period = parseCardPeriod(requireRecord(payload, "period").period);
      if (period === undefined) {
        throw new Error("Invalid period in API response");
      }
      return period;
    },
  });
}

export async function createCard(token: string, body: Record<string, unknown>): Promise<Card> {
  return apiRequest({
    path: "/cards",
    method: "POST",
    token,
    body,
    parseJson: (payload) => parseCard(requireRecord(payload, "card").card),
  });
}

export async function updateCard(
  token: string,
  id: string,
  body: Record<string, unknown>,
): Promise<Card> {
  return apiRequest({
    path: `/cards/${id}`,
    method: "PATCH",
    token,
    body,
    parseJson: (payload) => parseCard(requireRecord(payload, "card").card),
  });
}

export async function deleteCard(token: string, id: string): Promise<void> {
  await apiRequest({
    path: `/cards/${id}`,
    method: "DELETE",
    token,
    parseJson: () => undefined,
  });
}

export async function getCardStatement(
  token: string,
  cardId: string,
  month: string,
): Promise<CardStatement> {
  return apiRequest({
    path: `/cards/${cardId}/statement?month=${month}`,
    token,
    parseJson: (payload) => {
      const root = requireRecord(payload, "payload");
      const item = requireRecord(root.statement, "statement");
      const purchases = readArray(item, "purchases").map(parseTransaction);
      const totalsByCurrency = Array.isArray(item.totalsByCurrency)
        ? readArray(item, "totalsByCurrency").flatMap((entry) => {
            if (!isRecord(entry)) {
              return [];
            }
            return [
              {
                currency: readString(entry, "currency"),
                purchaseTotalMinor: readNumber(entry, "purchaseTotalMinor"),
              },
            ];
          })
        : [];
      const totals =
        totalsByCurrency.length > 0
          ? totalsByCurrency
          : [...purchases.reduce((map, purchase) => {
              map.set(purchase.currency, (map.get(purchase.currency) ?? 0) + purchase.amountMinor);
              return map;
            }, new Map<string, number>())].map(([currency, purchaseTotalMinor]) => ({
              currency,
              purchaseTotalMinor,
            }));
      return {
        month: readString(item, "month"),
        periodFrom: readString(item, "periodFrom"),
        periodTo: readString(item, "periodTo"),
        dueOn: readString(item, "dueOn"),
        currency: readString(item, "currency"),
        purchaseTotalMinor: readNumber(item, "purchaseTotalMinor"),
        totalsByCurrency: totals,
        purchases,
      };
    },
  });
}

export async function listRecurring(token: string): Promise<Recurring[]> {
  return apiRequest({
    path: "/recurring?includeInactive=true",
    token,
    parseJson: (payload) => readArray(requireRecord(payload, "recurring"), "recurring").map(parseRecurring),
  });
}

export async function createRecurring(
  token: string,
  body: Record<string, unknown>,
): Promise<Recurring> {
  return apiRequest({
    path: "/recurring",
    method: "POST",
    token,
    body,
    parseJson: (payload) => parseRecurring(requireRecord(payload, "recurring").recurring),
  });
}

export async function updateRecurring(
  token: string,
  id: string,
  body: Record<string, unknown>,
): Promise<Recurring> {
  return apiRequest({
    path: `/recurring/${id}`,
    method: "PATCH",
    token,
    body,
    parseJson: (payload) => parseRecurring(requireRecord(payload, "recurring").recurring),
  });
}

export async function deleteRecurring(token: string, id: string): Promise<void> {
  await apiRequest({
    path: `/recurring/${id}`,
    method: "DELETE",
    token,
    parseJson: () => undefined,
  });
}

export async function listBudgets(token: string, month: string): Promise<Budget[]> {
  return apiRequest({
    path: `/budgets?month=${month}`,
    token,
    parseJson: (payload) => readArray(requireRecord(payload, "budgets"), "budgets").map(parseBudget),
  });
}

export async function createBudget(
  token: string,
  body: { categoryId: string; amountMinor: number; currency: string; yearMonth: string },
): Promise<Budget> {
  return apiRequest({
    path: "/budgets",
    method: "POST",
    token,
    body,
    parseJson: (payload) => parseBudget(requireRecord(payload, "budget").budget),
  });
}

export async function updateBudget(
  token: string,
  id: string,
  amountMinor: number,
): Promise<Budget> {
  return apiRequest({
    path: `/budgets/${id}`,
    method: "PATCH",
    token,
    body: { amountMinor },
    parseJson: (payload) => parseBudget(requireRecord(payload, "budget").budget),
  });
}

export async function deleteBudget(token: string, id: string): Promise<void> {
  await apiRequest({
    path: `/budgets/${id}`,
    method: "DELETE",
    token,
    parseJson: () => undefined,
  });
}

export async function inviteMember(token: string, email: string, groupId?: string): Promise<void> {
  await apiRequest({
    path: "/household/invites",
    method: "POST",
    token,
    body: groupId === undefined ? { email } : { email, groupId },
    parseJson: () => undefined,
  });
}

export async function assignMemberGroup(token: string, userId: string, groupId: string): Promise<void> {
  await apiRequest({
    path: `/household/members/${userId}/group`,
    method: "PATCH",
    token,
    body: { groupId },
    parseJson: () => undefined,
  });
}

export async function listPermissions(token: string): Promise<PermissionDefinition[]> {
  return apiRequest({
    path: "/permissions",
    token,
    parseJson: (payload) =>
      readArray(requireRecord(payload, "permissions"), "permissions").flatMap((item) => {
        if (!isRecord(item)) {
          return [];
        }
        return [
          {
            permission: readString(item, "permission"),
            resource: readString(item, "resource"),
            action: readString(item, "action"),
            label: readString(item, "label"),
          },
        ];
      }),
  });
}

export async function listGroups(token: string): Promise<UserGroup[]> {
  return apiRequest({
    path: "/groups",
    token,
    parseJson: (payload) => readArray(requireRecord(payload, "groups"), "groups").map(parseUserGroup),
  });
}

export async function createGroup(
  token: string,
  body: { name: string; permissions: string[] },
): Promise<UserGroup> {
  return apiRequest({
    path: "/groups",
    method: "POST",
    token,
    body,
    parseJson: (payload) => parseUserGroup(requireRecord(payload, "group").group),
  });
}

export async function updateGroup(
  token: string,
  id: string,
  body: { name?: string; permissions?: string[] },
): Promise<UserGroup> {
  return apiRequest({
    path: `/groups/${id}`,
    method: "PATCH",
    token,
    body,
    parseJson: (payload) => parseUserGroup(requireRecord(payload, "group").group),
  });
}

export async function deleteGroup(token: string, id: string): Promise<void> {
  await apiRequest({
    path: `/groups/${id}`,
    method: "DELETE",
    token,
    parseJson: () => undefined,
  });
}

export async function shareMonthExcel(token: string, month: string): Promise<void> {
  const file = await apiDownload({
    path: `/exports/xlsx?month=${month}`,
    token,
  });
  if (cacheDirectory === null) {
    throw new Error("No hay carpeta temporal para guardar el Excel");
  }
  const uri = `${cacheDirectory}${file.fileName}`;
  await writeAsStringAsync(uri, file.base64, { encoding: EncodingType.Base64 });
  if (!(await isAvailableAsync())) {
    throw new Error("Este dispositivo no puede compartir archivos");
  }
  await shareAsync(uri, {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    UTI: "org.openxmlformats.spreadsheetml.sheet",
    dialogTitle: file.fileName,
  });
}

function parseMassImportStatus(value: unknown): MassImport["status"] {
  if (value === "DRAFT" || value === "CONFIRMED" || value === "CANCELLED" || value === "DISCARDED") {
    return value;
  }
  return "DRAFT";
}

function parseMassImportFile(value: unknown): MassImportFile {
  const item = requireRecord(value, "massImportFile");
  return {
    id: readString(item, "id"),
    contentType: readString(item, "contentType"),
    sizeBytes: readNumber(item, "sizeBytes"),
    originalFileName: readString(item, "originalFileName"),
    sortOrder: readNumber(item, "sortOrder"),
  };
}

function parseMassImportDraftItem(value: unknown): MassImportDraftItem {
  const item = requireRecord(value, "draftItem");
  return {
    clientId: readString(item, "clientId"),
    selected: readBoolean(item, "selected"),
    source: item.source === "MANUAL" ? "MANUAL" : "AI",
    type: item.type === "INCOME" ? "INCOME" : "EXPENSE",
    status: parseTransactionStatus(item.status),
    amountMinor: readNumber(item, "amountMinor"),
    currency: typeof item.currency === "string" ? item.currency : "",
    description: readNullableString(item, "description"),
    occurredOn: readNullableString(item, "occurredOn") ?? "",
    approvedOn: readNullableString(item, "approvedOn") ?? "",
    categoryId: readNullableString(item, "categoryId"),
    installmentCount: readNullableNumber(item, "installmentCount"),
    installmentNumber: readNullableNumber(item, "installmentNumber"),
  };
}

function parseMassImport(value: unknown): MassImport {
  const item = requireRecord(value, "massImport");
  return {
    id: readString(item, "id"),
    status: parseMassImportStatus(item.status),
    importedFromImage: readBoolean(item, "importedFromImage"),
    accountId: readNullableString(item, "accountId"),
    cardId: readNullableString(item, "cardId"),
    files: readArray(item, "files").map(parseMassImportFile),
    draftItems: readArray(item, "draftItems").map(parseMassImportDraftItem),
    fileCount: readNumber(item, "fileCount"),
    detectedCount: readNumber(item, "detectedCount"),
    confirmedCount: readNullableNumber(item, "confirmedCount"),
    createdAt: readString(item, "createdAt"),
    confirmedAt: readNullableString(item, "confirmedAt"),
  };
}

export function toMassImportDraftPayload(items: MassImportDraftItem[]): Record<string, unknown>[] {
  return items.map((item) => ({
    clientId: item.clientId,
    selected: item.selected,
    source: item.source,
    type: item.type,
    status: item.status,
    amountMinor: item.amountMinor,
    currency: item.currency,
    description: item.description ?? null,
    occurredOn: item.occurredOn === "" ? null : item.occurredOn,
    approvedOn: item.approvedOn === "" ? null : item.approvedOn,
    categoryId: item.categoryId ?? null,
    installmentCount: item.installmentCount ?? null,
    installmentNumber: item.installmentNumber ?? null,
  }));
}

export async function listMassImports(token: string): Promise<MassImport[]> {
  return apiRequest({
    path: "/mass-imports",
    token,
    parseJson: (payload) =>
      readArray(requireRecord(payload, "massImports"), "massImports").map(parseMassImport),
  });
}

export async function createMassImport(
  token: string,
  body: {
    accountId?: string;
    cardId?: string;
    files: Array<{ contentType: string; sizeBytes: number; originalFileName: string }>;
  },
): Promise<{ massImport: MassImport; uploads: MassImportUpload[] }> {
  return apiRequest({
    path: "/mass-imports",
    method: "POST",
    token,
    body,
    parseJson: (payload) => {
      const root = requireRecord(payload, "createMassImport");
      return {
        massImport: parseMassImport(root.massImport),
        uploads: readArray(root, "uploads").map((upload) => {
          const item = requireRecord(upload, "upload");
          return {
            fileId: readString(item, "fileId"),
            uploadUrl: readString(item, "uploadUrl"),
            expiresInSeconds: readNumber(item, "expiresInSeconds"),
          };
        }),
      };
    },
  });
}

export async function getMassImport(token: string, id: string): Promise<MassImport> {
  return apiRequest({
    path: `/mass-imports/${id}`,
    token,
    parseJson: (payload) => parseMassImport(requireRecord(payload, "massImport").massImport),
  });
}

export async function updateMassImportDraft(
  token: string,
  id: string,
  draftItems: MassImportDraftItem[],
): Promise<MassImport> {
  return apiRequest({
    path: `/mass-imports/${id}`,
    method: "PATCH",
    token,
    body: { draftItems: toMassImportDraftPayload(draftItems) },
    parseJson: (payload) => parseMassImport(requireRecord(payload, "massImport").massImport),
  });
}

export async function analyzeMassImport(token: string, id: string): Promise<MassImport> {
  return apiRequest({
    path: `/mass-imports/${id}/analyze`,
    method: "POST",
    token,
    body: {},
    parseJson: (payload) => parseMassImport(requireRecord(payload, "massImport").massImport),
  });
}

export async function confirmMassImport(
  token: string,
  id: string,
  draftItems: MassImportDraftItem[],
): Promise<MassImport> {
  return apiRequest({
    path: `/mass-imports/${id}/confirm`,
    method: "POST",
    token,
    body: { draftItems: toMassImportDraftPayload(draftItems) },
    parseJson: (payload) => parseMassImport(requireRecord(payload, "massImport").massImport),
  });
}

export async function cancelMassImport(token: string, id: string): Promise<MassImport> {
  return apiRequest({
    path: `/mass-imports/${id}/cancel`,
    method: "POST",
    token,
    body: {},
    parseJson: (payload) => parseMassImport(requireRecord(payload, "massImport").massImport),
  });
}

export async function getMassImportFileDownload(
  token: string,
  id: string,
  fileId: string,
): Promise<{ downloadUrl: string; file: MassImportFile }> {
  return apiRequest({
    path: `/mass-imports/${id}/files/${fileId}/download`,
    token,
    parseJson: (payload) => {
      const root = requireRecord(payload, "download");
      return {
        downloadUrl: readString(root, "downloadUrl"),
        file: parseMassImportFile(root.file),
      };
    },
  });
}

export async function uploadMassImportFile(
  uploadUrl: string,
  uri: string,
  contentType: string,
): Promise<void> {
  const fileResponse = await fetch(uri);
  const blob = await fileResponse.blob();
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!response.ok) {
    throw new Error("No se pudo subir el archivo");
  }
}
