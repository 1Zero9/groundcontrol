import { useEffect, useState } from "react";

/**
 * Returns the current Date, refreshed on an interval. Starts as `null` on
 * first render (matching server output) and is set to the real client time
 * inside an effect, avoiding hydration mismatches for date/time-based UI.
 */
export function useNow(intervalMs = 60000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const id = setInterval(updateNow, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
