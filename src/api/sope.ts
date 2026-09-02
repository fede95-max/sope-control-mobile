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
  MeResponse,
  Recurring,
  Transaction,
  TransactionStatus,
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
    seedCode: readNullableString(item, "seedCode"),
    isActive: readBoolean(item, "isActive"),
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
            return [{ userId: readString(member, "userId"), email: readString(member, "email") }];
          }),
          pendingInvites: readArray(household, "pendingInvites").flatMap((invite) => {
            if (!isRecord(invite)) {
              return [];
            }
            return [{ email: readString(invite, "email") }];
          }),
        },
      };
    },
  });
}

export async function listAccounts(token: string): Promise<Account[]> {
  return apiRequest({
    path: "/accounts",
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
  body: { name: string; kind: string },
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
              incomeMinor: readNumber(item, "incomeMinor"),
              expenseMinor: readNumber(item, "expenseMinor"),
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

export async function listCards(token: string): Promise<Card[]> {
  return apiRequest({
    path: "/cards",
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

export async function inviteMember(token: string, email: string): Promise<void> {
  await apiRequest({
    path: "/household/invites",
    method: "POST",
    token,
    body: { email },
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
