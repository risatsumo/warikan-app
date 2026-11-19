"use client";

import { useEffect, useState } from "react";

import { loadAppData, saveAppData } from "@/lib/storage";
import type { AppData, Trip } from "@/types/domain";

import { TripForm } from "./trip-form";
import { TripList } from "./trip-list";

export function HomeScreen() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const result = loadAppData(window.localStorage);
      setAppData(result.data);

      if (!result.ok) {
        setStorageError(result.error.message);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleCreateTrip(trip: Trip): string | null {
    if (appData === null) {
      return "旅行データの読み込みが終わってから、もう一度お試しください。";
    }

    const nextData: AppData = {
      ...appData,
      trips: [trip, ...appData.trips],
    };
    const result = saveAppData(window.localStorage, nextData);

    if (!result.ok) {
      return result.error.message;
    }

    setAppData(nextData);
    setStorageError(null);
    return null;
  }

  return (
    <div className="space-y-5">
      {storageError !== null && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          <span className="font-semibold">保存データに問題があります。</span>{" "}
          {storageError}
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
        <TripForm
          disabled={appData === null}
          onCreateTrip={handleCreateTrip}
        />
        <TripList isLoading={appData === null} trips={appData?.trips ?? []} />
      </div>
    </div>
  );
}
