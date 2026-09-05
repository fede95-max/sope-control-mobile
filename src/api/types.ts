export type ApiErrorBody = {
  code: string;
  message: string;
};

export type UserProfile = {
  id: string;
  email: string;
  householdId: string;
  ownedHouseholdId: string | undefined;
  timezone: string;
  defaultCurrency: string;
  isRoot: boolean;
};

export type HouseholdMemberRole = "OWNER" | "INVITED";

export type HouseholdMember = {
  userId: string;
  email: string;
  groupId: string | undefined;
  role: HouseholdMemberRole | undefined;
};

export type HouseholdInvite = {
  email: string;
  groupId: string | undefined;
};

export type HouseholdMembership = {
  id: string;
  role: "OWNER" | "INVITED" | "ROOT";
  label: string;
  ownerEmail: string | undefined;
  isActive: boolean;
};

export type UserGroup = {
  id: string;
  name: string;
  seedCode: string | undefined;
  permissions: string[];
  isSystem: boolean;
};

export type PermissionDefinition = {
  permission: string;
  resource: string;
  action: string;
  label: string;
};

export type DirectoryMembership = {
  householdId: string;
  role: HouseholdMemberRole;
  groupId: string | undefined;
  groupName: string | undefined;
  ownerEmail: string | undefined;
  label: string;
  isActive: boolean;
};

export type DirectoryUser = {
  id: string;
  email: string;
  isRoot: boolean;
  activeHouseholdId: string;
  ownedHouseholdId: string | undefined;
  memberships: DirectoryMembership[];
};

export type MeResponse = {
  user: UserProfile;
  household: {
    id: string;
    ownerUserId: string | undefined;
    canRemoveMembers: boolean;
    members: HouseholdMember[];
    pendingInvites: HouseholdInvite[];
  };
  households: HouseholdMembership[];
  group: UserGroup | undefined;
  permissions: string[];
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
  color: string;
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
  massImportId: string | undefined;
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

export type MassImportStatus = "DRAFT" | "CONFIRMED" | "CANCELLED" | "DISCARDED";

export type MassImportFile = {
  id: string;
  contentType: string;
  sizeBytes: number;
  originalFileName: string;
  sortOrder: number;
};

export type MassImportDraftItem = {
  clientId: string;
  selected: boolean;
  source: "AI" | "MANUAL";
  type: "INCOME" | "EXPENSE";
  status: TransactionStatus;
  amountMinor: number;
  currency: string;
  description: string | undefined;
  occurredOn: string;
  approvedOn: string;
  categoryId: string | undefined;
  installmentCount: number | undefined;
  installmentNumber: number | undefined;
};

export type MassImport = {
  id: string;
  status: MassImportStatus;
  importedFromImage: boolean;
  accountId: string | undefined;
  cardId: string | undefined;
  files: MassImportFile[];
  draftItems: MassImportDraftItem[];
  fileCount: number;
  detectedCount: number;
  confirmedCount: number | undefined;
  createdAt: string;
  confirmedAt: string | undefined;
};

export type MassImportUpload = {
  fileId: string;
  uploadUrl: string;
  expiresInSeconds: number;
};
