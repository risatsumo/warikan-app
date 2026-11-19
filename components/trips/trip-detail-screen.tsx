"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { addPaymentToTrip } from "@/lib/payments";
import { loadAppData, saveAppData } from "@/lib/storage";
import { addMemberToTrip, findTripById } from "@/lib/trips";
import type { AppData, Payment, Trip } from "@/types/domain";

import { MemberList } from "./member-list";
import { PaymentList } from "./payment-list";
import { SettlementSummary } from "./settlement-summary";

interface TripDetailScreenProps {
  readonly tripId: string;
}

type TripLoadState =
  | { readonly status: "loading" }
  | {
      readonly status: "ready";
      readonly appData: AppData;
      readonly trip: Trip;
    }
  | { readonly status: "not-found" }
  | { readonly status: "error"; readonly message: string };

export function TripDetailScreen({ tripId }: TripDetailScreenProps) {
  const [loadState, setLoadState] = useState<TripLoadState>({
    status: "loading",
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const result = loadAppData(window.localStorage);

      if (!result.ok) {
        setLoadState({ status: "error", message: result.error.message });
        return;
      }

      const trip = findTripById(result.data, tripId);
      setLoadState(
        trip === null
          ? { status: "not-found" }
          : { status: "ready", appData: result.data, trip },
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [tripId]);

  function handleAddMember(memberName: string): string | null {
    if (loadState.status !== "ready") {
      return "旅行データの読み込みが終わってから、もう一度お試しください。";
    }

    const result = addMemberToTrip(loadState.appData, tripId, memberName);

    if (!result.ok) {
      return result.error;
    }

    const saveResult = saveAppData(window.localStorage, result.data);

    if (!saveResult.ok) {
      return saveResult.error.message;
    }

    setLoadState({
      status: "ready",
      appData: result.data,
      trip: result.trip,
    });
    return null;
  }

  function handleAddPayment(payment: Payment): string | null {
    if (loadState.status !== "ready") {
      return "旅行データの読み込みが終わってから、もう一度お試しください。";
    }

    const result = addPaymentToTrip(loadState.appData, tripId, payment);

    if (!result.ok) {
      return result.error;
    }

    const saveResult = saveAppData(window.localStorage, result.data);

    if (!saveResult.ok) {
      return saveResult.error.message;
    }

    setLoadState({
      status: "ready",
      appData: result.data,
      trip: result.trip,
    });
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_48%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_42%)]"
      />

      <main className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-700 transition hover:bg-white hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        >
          <span aria-hidden="true">←</span>
          旅行一覧へ戻る
        </Link>

        {loadState.status === "loading" && <LoadingState />}
        {loadState.status === "error" && (
          <MessageState
            icon="⚠️"
            title="旅行データを読み込めませんでした"
            description={loadState.message}
            tone="error"
          />
        )}
        {loadState.status === "not-found" && (
          <MessageState
            icon="🧳"
            title="旅行が見つかりません"
            description="旅行が削除されているか、URLが正しくない可能性があります。旅行一覧から選び直してください。"
            tone="neutral"
          />
        )}
        {loadState.status === "ready" && (
          <TripDetails
            trip={loadState.trip}
            onAddMember={handleAddMember}
            onAddPayment={handleAddPayment}
          />
        )}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <section
      aria-live="polite"
      className="mt-6 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)]"
    >
      <p className="text-sm font-semibold text-slate-500">
        旅行データを読み込んでいます…
      </p>
    </section>
  );
}

interface MessageStateProps {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly tone: "error" | "neutral";
}

function MessageState({
  icon,
  title,
  description,
  tone,
}: MessageStateProps) {
  return (
    <section
      role={tone === "error" ? "alert" : undefined}
      className={`mt-6 rounded-3xl border bg-white px-6 py-14 text-center shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] ${
        tone === "error" ? "border-red-200" : "border-slate-200"
      }`}
    >
      <div
        aria-hidden="true"
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-2xl"
      >
        {icon}
      </div>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </section>
  );
}

interface TripDetailsProps {
  readonly trip: Trip;
  readonly onAddMember: (memberName: string) => string | null;
  readonly onAddPayment: (payment: Payment) => string | null;
}

function TripDetails({
  trip,
  onAddMember,
  onAddPayment,
}: TripDetailsProps) {
  return (
    <div className="mt-6 space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-600">
          Trip details
        </p>
        <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          {trip.name}
        </h1>
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">
            参加者 {trip.members.length}人
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
            支払い {trip.payments.length}件
          </span>
        </div>
      </header>

      <SettlementSummary trip={trip} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]">
        <MemberList members={trip.members} onAddMember={onAddMember} />
        <PaymentList
          members={trip.members}
          payments={trip.payments}
          onAddPayment={onAddPayment}
        />
      </div>
    </div>
  );
}
