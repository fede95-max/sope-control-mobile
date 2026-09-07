export type RootStackParamList = {
  Login: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Accounts: undefined;
  Cards: undefined;
  More: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Settings: undefined;
  Categories: undefined;
  Budgets: undefined;
  Recurring: undefined;
  Household: undefined;
  Groups: undefined;
  Users: undefined;
  MassImports: undefined;
  MassImportNew: undefined;
  MassImportReview: { id: string };
};
