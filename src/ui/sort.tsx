import { useMemo } from "react";

export type SortOption<T> = {
  id: string;
  label: string;
  compare: (a: T, b: T) => number;
};

export function compareText(a: string | undefined, b: string | undefined): number {
  return (a ?? "").localeCompare(b ?? "", "es", { sensitivity: "base" });
}

export function compareNumber(a: number | undefined, b: number | undefined): number {
  return (a ?? 0) - (b ?? 0);
}

export function useSortedItems<T>(items: T[], sortId: string, options: Array<SortOption<T>>): T[] {
  return useMemo(() => {
    const option = options.find((item) => item.id === sortId) ?? options[0];
    if (option === undefined) {
      return items;
    }
    return [...items].sort(option.compare);
  }, [items, sortId, options]);
}
