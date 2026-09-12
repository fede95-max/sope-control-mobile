import { formatAmountFromMinor } from "../money";

export type CurrencyTotal = {
  currency: string;
  amountMinor: number;
};

export function sumByCurrency<T>(
  items: T[],
  getMinor: (item: T) => number,
  getCurrency: (item: T) => string,
): CurrencyTotal[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const currency = getCurrency(item);
    map.set(currency, (map.get(currency) ?? 0) + getMinor(item));
  }
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amountMinor]) => ({ currency, amountMinor }));
}

export function formatLabeledTotals(prefix: string, totals: CurrencyTotal[]): string {
  if (totals.length === 0) {
    return `${prefix} 0,00`;
  }
  return totals
    .map((item, index) => {
      const amount = formatAmountFromMinor(item.amountMinor);
      if (item.currency === "") {
        return index === 0 ? `${prefix} ${amount}` : amount;
      }
      const label = index === 0 ? `${prefix} ${item.currency}` : item.currency;
      return `${label}: ${amount}`;
    })
    .join(" · ");
}

export function summarizeCardTotals(
  cards: Array<{ kind: string; totalsByCurrency: Array<{ currency: string; purchaseTotalMinor: number }> }>,
): CurrencyTotal[] {
  const rows: Array<{ currency: string; amountMinor: number }> = [];
  for (const card of cards) {
    if (card.kind !== "CREDIT") {
      continue;
    }
    for (const total of card.totalsByCurrency) {
      rows.push({ currency: total.currency, amountMinor: total.purchaseTotalMinor });
    }
  }
  return sumByCurrency(rows, (row) => row.amountMinor, (row) => row.currency);
}

export type TypeMoneyBreakdown = {
  currency: string;
  incomeMinor: number;
  expenseMinor: number;
  transferMinor: number;
};

export function summarizeTypeMoney(
  items: Array<{ type: string; amountMinor: number; currency: string }>,
): TypeMoneyBreakdown[] {
  const map = new Map<string, { incomeMinor: number; expenseMinor: number; transferMinor: number }>();
  for (const item of items) {
    const current = map.get(item.currency) ?? { incomeMinor: 0, expenseMinor: 0, transferMinor: 0 };
    if (item.type === "INCOME") {
      current.incomeMinor += item.amountMinor;
    } else if (item.type === "EXPENSE") {
      current.expenseMinor += item.amountMinor;
    } else if (item.type === "TRANSFER") {
      current.transferMinor += item.amountMinor;
    }
    map.set(item.currency, current);
  }
  const rows = [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, totals]) => ({ currency, ...totals }));
  if (rows.length === 0) {
    return [{ currency: "", incomeMinor: 0, expenseMinor: 0, transferMinor: 0 }];
  }
  return rows;
}

export function formatTypeMoneyTotals(breakdown: TypeMoneyBreakdown[]): string[] {
  const omitCurrency = breakdown.length === 1;
  return breakdown.map((item) => {
    const iet = `I: ${formatAmountFromMinor(item.incomeMinor)}  E: ${formatAmountFromMinor(item.expenseMinor)}  T: ${formatAmountFromMinor(item.transferMinor)}`;
    if (omitCurrency || item.currency === "") {
      return iet;
    }
    return `${item.currency}  ${iet}`;
  });
}

export type MassImportMoneyTotal = {
  currency: string;
  detectedTotalMinor: number;
  confirmedTotalMinor: number;
};

export function summarizeMassImports(
  items: Array<{
    currency: string | undefined;
    detectedTotalMinor: number;
    confirmedTotalMinor: number | undefined;
    draftItems: Array<{ currency: string }>;
  }>,
): MassImportMoneyTotal[] {
  const map = new Map<string, { detectedTotalMinor: number; confirmedTotalMinor: number }>();
  for (const item of items) {
    const currency =
      item.currency !== undefined && item.currency !== ""
        ? item.currency
        : (item.draftItems.find((draft) => draft.currency !== "")?.currency ?? "");
    const current = map.get(currency) ?? { detectedTotalMinor: 0, confirmedTotalMinor: 0 };
    current.detectedTotalMinor += item.detectedTotalMinor;
    current.confirmedTotalMinor += item.confirmedTotalMinor ?? 0;
    map.set(currency, current);
  }
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, totals]) => ({ currency, ...totals }));
}

export function formatMassImportTotals(totals: MassImportMoneyTotal[]): string {
  if (totals.length === 0) {
    return "0,00 detectados · 0,00 confirmados";
  }
  return totals
    .map((item) => {
      const amounts = `${formatAmountFromMinor(item.detectedTotalMinor)} detectados · ${formatAmountFromMinor(item.confirmedTotalMinor)} confirmados`;
      return item.currency === "" ? amounts : `${item.currency}: ${amounts}`;
    })
    .join(" · ");
}

export type NetDraftItem = {
  selected: boolean;
  type: string;
  amountMinor: number;
  currency: string;
};

export function computeItemNetMinor(item: { type: string; amountMinor: number }): number {
  if (item.type === "INCOME") {
    return item.amountMinor;
  }
  if (item.type === "EXPENSE") {
    return -item.amountMinor;
  }
  return 0;
}

export function summarizeNetBySelection(items: NetDraftItem[], selected: boolean): CurrencyTotal[] {
  return sumByCurrency(
    items.filter((item) => item.selected === selected),
    computeItemNetMinor,
    (item) => item.currency,
  );
}

function formatCurrencyTotals(totals: CurrencyTotal[]): string {
  if (totals.length === 0) {
    return "0,00";
  }
  return totals
    .map((item) => {
      const amount = formatAmountFromMinor(item.amountMinor);
      return item.currency === "" ? amount : `${item.currency}: ${amount}`;
    })
    .join(" · ");
}

export function formatNetBySelection(items: NetDraftItem[], selected: boolean): string {
  return formatCurrencyTotals(summarizeNetBySelection(items, selected));
}

export function formatMassImportRecordTotals(item: { draftItems: NetDraftItem[] }): string {
  const confirmed = new Map(summarizeNetBySelection(item.draftItems, true).map((row) => [row.currency, row.amountMinor]));
  const unconfirmed = new Map(
    summarizeNetBySelection(item.draftItems, false).map((row) => [row.currency, row.amountMinor]),
  );
  const currencies = [...new Set([...confirmed.keys(), ...unconfirmed.keys()])].sort((left, right) =>
    left.localeCompare(right),
  );
  if (currencies.length === 0) {
    return "0,00 confirmado · 0,00 sin confirmar";
  }
  return currencies
    .map((currency) => {
      const amounts = `${formatAmountFromMinor(confirmed.get(currency) ?? 0)} confirmado · ${formatAmountFromMinor(unconfirmed.get(currency) ?? 0)} sin confirmar`;
      return currency === "" ? amounts : `${currency}: ${amounts}`;
    })
    .join(" · ");
}

export function formatSelectionNetTotals(draftItems: NetDraftItem[]): string[] {
  return [
    formatLabeledTotals("Confirmados:", summarizeNetBySelection(draftItems, true)),
    formatLabeledTotals("Sin confirmar:", summarizeNetBySelection(draftItems, false)),
  ];
}
