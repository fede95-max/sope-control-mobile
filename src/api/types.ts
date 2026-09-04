export type ApiErrorBody = {
  code: string;
  message: string;
};

export type UserProfile = {
  id: string;
  email: string;
  householdId: string;
  timezone: string;
  defaultCurrency: string;
};

export type HouseholdMember = {
  userId: string;
  email: string;
};

export type HouseholdInvite = {
  email: string;
};

export type MeResponse = {
  user: UserProfile;
  household: {
    id: string;
    members: HouseholdMember[];
    pendingInvites: HouseholdInvite[];
  };
};

export type Account = {
  id: string;
  name: string;
  type: string;
  currency: string;
  isActive: boolean;
  balanceMinor: number;
};

export type Category = {
  id: string;
  name: string;
  kind: string;
  seedCode: string | undefined;
  isActive: boolean;
};

export type TransactionStatus = "PENDING" | "APPROVED";

export type Transaction = {
  id: string;
  type: string;
  status: TransactionStatus;
  amountMinor: number;
  currency: string;
  description: string | undefined;
  occurredOn: string;
  approvedOn: string | undefined;
  categoryId: string | undefined;
  accountId: string | undefined;
  fromAccountId: string | undefined;
  toAccountId: string | undefined;
  cardId: string | undefined;
  statementYearMonth: string | undefined;
  installmentCount: number | undefined;
  installmentNumber: number | undefined;
};

export type Card = {
  id: string;
  name: string;
  kind: string;
  brand: string;
  last4: string;
  currency: string;
  isActive: boolean;
  accountId: string | undefined;
  closingDay: number | undefined;
  dueDay: number | undefined;
};

export type CardPeriod = {
  cardId: string;
  yearMonth: string;
  closingOn: string;
  dueOn: string;
};

export type CardOverview = Card & {
  period: CardPeriod | undefined;
  periodFrom: string | undefined;
  periodTo: string | undefined;
  dueOn: string | undefined;
  totalsByCurrency: Array<{ currency: string; purchaseTotalMinor: number }>;
};

export type Recurring = {
  id: string;
  name: string;
  type: string;
  amountMinor: number;
  currency: string;
  dayOfMonth: number;
  startOn: string;
  endOn: string | undefined;
  installmentCount: number | undefined;
  description: string | undefined;
  nextRunOn: string;
  isActive: boolean;
  categoryId: string | undefined;
  accountId: string | undefined;
  cardId: string | undefined;
};

export type CardStatement = {
  month: string;
  periodFrom: string;
  periodTo: string;
  dueOn: string;
  currency: string;
  purchaseTotalMinor: number;
  totalsByCurrency: Array<{ currency: string; purchaseTotalMinor: number }>;
  purchases: Transaction[];
};

export type Budget = {
  id: string;
  categoryId: string;
  yearMonth: string;
  amountMinor: number;
  currency: string;
  spentMinor: number;
  remainingMinor: number;
  percentUsed: number;
};

export type Dashboard = {
  month: string;
  totals: Array<{
    currency: string;
    accountsMinor: number;
    cardMovementsMinor: number;
    balanceMinor: number;
  }>;
  expensesByCategory: Array<{
    categoryId: string;
    amountMinor: number;
    currency: string;
  }>;
};
