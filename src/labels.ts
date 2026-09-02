import type { Transaction, TransactionStatus } from "./api/types";

export function typeLabel(type: string): string {
  if (type === "INCOME") {
    return "Ingreso";
  }
  if (type === "TRANSFER") {
    return "Transferencia";
  }
  return "Egreso";
}

export function statusLabel(status: TransactionStatus): string {
  return status === "PENDING" ? "Pendiente" : "Aprobado";
}

export function accountTypeLabel(type: string): string {
  if (type === "CASH") {
    return "Efectivo";
  }
  if (type === "BANK") {
    return "Banco";
  }
  if (type === "WALLET") {
    return "Billetera";
  }
  return "Otra";
}

export function categoryKindLabel(kind: string): string {
  if (kind === "INCOME") {
    return "Ingreso";
  }
  if (kind === "BOTH") {
    return "Ambos";
  }
  return "Egreso";
}

export function cardKindLabel(kind: string): string {
  return kind === "CREDIT" ? "Crédito" : "Débito";
}

export function resolveAccountLabel(transaction: Transaction, accountName: Map<string, string>): string {
  if (transaction.type === "TRANSFER") {
    const from = accountName.get(transaction.fromAccountId ?? "") ?? "";
    const to = accountName.get(transaction.toAccountId ?? "") ?? "";
    if (from !== "" && to !== "") {
      return `${from} → ${to}`;
    }
    return from || to;
  }
  if (transaction.accountId === undefined) {
    return "";
  }
  return accountName.get(transaction.accountId) ?? "";
}

export function resolveCardLabel(transaction: Transaction, cardName: Map<string, string>): string {
  if (transaction.cardId === undefined) {
    return "";
  }
  return cardName.get(transaction.cardId) ?? "";
}
