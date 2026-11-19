"use client";

import { useEffect, useState } from "react";

import { loadAppData, saveAppData } from "@/lib/storage";
import { addTrip, removeAllTrips, removeTrip } from "@/lib/trips";
import type { AppData, Trip } from "@/types/domain";

import { ConfirmDialog } from "../ui/confirm-dialog";
import { TripForm } from "./trip-form";
import { TripList } from "./trip-list";

type PendingDeletion =
  | { readonly type: "trip"; readonly trip: Trip }
  | { readonly type: "all" }
  | null;

export function HomeScreen() {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] =
    useState<PendingDeletion>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

    const nextData = addTrip(appData, trip);
    const result = saveAppData(window.localStorage, nextData);

    if (!result.ok) {
      return result.error.message;
    }

    setAppData(nextData);
    setStorageError(null);
    return null;
  }

  function handleRequestDeleteTrip(trip: Trip) {
    setDeleteError(null);
    setPendingDeletion({ type: "trip", trip });
  }

  function handleRequestDeleteAll() {
    setDeleteError(null);
    setPendingDeletion({ type: "all" });
  }

  function handleCancelDelete() {
    setDeleteError(null);
    setPendingDeletion(null);
  }

  function handleConfirmDelete() {
    if (appData === null || pendingDeletion === null) {
      return;
    }

    const nextData =
      pendingDeletion.type === "trip"
        ? removeTrip(appData, pendingDeletion.trip.id)
        : removeAllTrips(appData);
    const result = saveAppData(window.localStorage, nextData);

    if (!result.ok) {
      setDeleteError(result.error.message);
      return;
    }

    setAppData(nextData);
    setStorageError(null);
    setDeleteError(null);
    setPendingDeletion(null);
  }

  const dialogTitle =
    pendingDeletion?.type === "trip"
      ? `「${pendingDeletion.trip.name}」を削除しますか？`
      : "すべての旅行データを削除しますか？";
  const dialogDescription =
    pendingDeletion?.type === "trip"
      ? "この旅行のメンバーと支払いもすべて削除されます。この操作は元に戻せません。"
      : `${appData?.trips.length ?? 0}件の旅行と、その中のメンバー・支払いをすべて削除します。この操作は元に戻せません。`;

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
        <TripList
          isLoading={appData === null}
          trips={appData?.trips ?? []}
          onRequestDeleteAll={handleRequestDeleteAll}
          onRequestDeleteTrip={handleRequestDeleteTrip}
        />
      </div>

      <ConfirmDialog
        open={pendingDeletion !== null}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={
          pendingDeletion?.type === "all" ? "すべて削除する" : "削除する"
        }
        error={deleteError}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
