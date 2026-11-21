import { useCallback, useEffect, useState } from "react";

import { loadAppData, saveAppData } from "@/lib/storage";
import { findTripById } from "@/lib/trips";
import type { AppData, Trip } from "@/types/domain";

export type TripLoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly appData: AppData; readonly trip: Trip }
  | { readonly status: "not-found" }
  | { readonly status: "error"; readonly message: string };

export function useTripDetailData(tripId: string) {
  const [state, setState] = useState<TripLoadState>({ status: "loading" });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const result = loadAppData(window.localStorage);
      if (!result.ok) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      const trip = findTripById(result.data, tripId);
      setState(trip === null ? { status: "not-found" } : { status: "ready", appData: result.data, trip });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [tripId]);

  const persist = useCallback((data: AppData, trip: Trip): string | null => {
    const result = saveAppData(window.localStorage, data);
    if (!result.ok) return result.error.message;
    setState({ status: "ready", appData: data, trip });
    return null;
  }, []);

  return { state, setState, persist };
}
