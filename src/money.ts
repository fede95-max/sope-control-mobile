export function formatAmountFromMinor(amountMinor: number): string {
  const sign = amountMinor < 0 ? "-" : "";
  const absolute = Math.abs(amountMinor);
  const whole = Math.trunc(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped},${fraction}`;
}

export function parseAmountToMinor(value: string): number {
  const trimmed = value.trim();
  let normalized: string;
  if (trimmed.includes(",")) {
    normalized = trimmed.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+\.\d{1,2}$/.test(trimmed)) {
    normalized = trimmed;
  } else {
    normalized = trimmed.replace(/\./g, "");
  }

  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);
  if (match === null) {
    throw new Error("El monto debe ser un número positivo con hasta 2 decimales");
  }

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "00").padEnd(2, "0"));
  const amountMinor = whole * 100 + fraction;
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 1) {
    throw new Error("El monto debe ser mayor a 0");
  }

  return amountMinor;
}

export function formatCalendarDate(value: string | undefined): string {
  if (value === undefined || value === "") {
    return "";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
    return value;
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function formatInstallment(
  installmentNumber: number | undefined,
  installmentCount: number | undefined,
): string {
  if (installmentNumber === undefined || installmentCount === undefined) {
    return "";
  }
  return `${installmentNumber}/${installmentCount}`;
}

export function currentYearMonth(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

export function currentCalendarDate(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function formatYearMonth(yearMonth: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return yearMonth;
  }
  const monthIndex = Number(match[2]) - 1;
  const name = MONTH_NAMES[monthIndex];
  if (name === undefined) {
    return yearMonth;
  }
  return `${name} ${match[1]}`;
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return yearMonth;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parseCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
    return new Date();
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function toCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
