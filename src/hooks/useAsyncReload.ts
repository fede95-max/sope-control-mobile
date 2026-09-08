import { useEffect } from "react";

export function useAsyncReload(
  reload: (isStale: () => boolean) => void | Promise<void>,
  deps: readonly unknown[],
  debounceMs = 200,
): void {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void reload(() => cancelled);
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Callers pass the values that should retrigger a load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
