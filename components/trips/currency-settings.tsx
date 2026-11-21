import { useState, type FormEvent } from "react";

import {
  createExchangeRate,
  normalizePositiveExchangeRate,
} from "@/lib/exchange-rates";
import type { CurrencyCode, ExchangeRate } from "@/types/domain";

interface CurrencySettingsProps {
  readonly currency: CurrencyCode;
  readonly exchangeRate: ExchangeRate | null;
  readonly onSaveExchangeRate: (exchangeRate: ExchangeRate) => string | null;
}

interface ExchangeRateApiResponse {
  readonly localCurrency: string;
  readonly jpyPerCurrency: string;
  readonly rateDate: string;
  readonly retrievedAt: string;
}

export function CurrencySettings({
  currency,
  exchangeRate,
  onSaveExchangeRate,
}: CurrencySettingsProps) {
  const [manualRate, setManualRate] = useState(
    exchangeRate?.jpyPerCurrency ?? "",
  );
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function saveRate(exchangeRate: ExchangeRate, successMessage: string) {
    const saveError = onSaveExchangeRate(exchangeRate);

    if (saveError !== null) {
      setError(saveError);
      setMessage(null);
      return;
    }

    setManualRate(exchangeRate.jpyPerCurrency);
    setError(null);
    setMessage(successMessage);
  }

  async function handleFetchLatestRate() {
    setIsFetching(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/exchange-rate?currency=${encodeURIComponent(currency)}`,
        { cache: "no-store" },
      );
      const data: unknown = await response.json();

      if (!response.ok || !isExchangeRateApiResponse(data)) {
        throw new Error(
          isRecord(data) && typeof data.error === "string"
            ? data.error
            : "最新レートを取得できませんでした。",
        );
      }

      const exchangeRate = createExchangeRate({
        currency,
        jpyPerCurrency: data.jpyPerCurrency,
        source: "frankfurter",
        rateDate: data.rateDate,
        updatedAt: data.retrievedAt,
      });

      if (exchangeRate === null) {
        throw new Error("取得した為替レートの形式が正しくありません。");
      }

      saveRate(exchangeRate, "最新の為替レートを保存しました。");
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "最新レートを取得できませんでした。",
      );
    } finally {
      setIsFetching(false);
    }
  }

  function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedRate = normalizePositiveExchangeRate(manualRate);

    if (normalizedRate === null) {
      setError("1現地通貨あたりの円を、12桁以内の正の数で入力してください。");
      setMessage(null);
      return;
    }

    const exchangeRate = createExchangeRate({
      currency,
      jpyPerCurrency: normalizedRate,
      source: "manual",
      rateDate: null,
      updatedAt: new Date().toISOString(),
    });

    if (exchangeRate === null) {
      setError("為替レートを保存できませんでした。");
      return;
    }

    saveRate(exchangeRate, "手入力の為替レートを保存しました。");
  }

  return (
    <section className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.25)] sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
            Exchange rate
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">為替レート</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            1 {currency} を何円として精算するかを旅行に保存します。
          </p>
        </div>
        <button
          type="button"
          disabled={isFetching}
          className="min-h-11 shrink-0 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-wait disabled:bg-indigo-400"
          onClick={handleFetchLatestRate}
        >
          {isFetching ? "取得中…" : "最新レートを取得"}
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-indigo-100 bg-white px-4 py-4">
        {exchangeRate === null ? (
          <p className="text-sm font-semibold text-amber-800">
            為替レートが未設定です。API取得または手入力をしてください。
          </p>
        ) : (
          <>
            <p className="text-lg font-bold text-slate-950">
              1 {currency} = {exchangeRate.jpyPerCurrency} 円
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {exchangeRate.source === "frankfurter"
                ? `Frankfurter参照レート（${exchangeRate.rateDate}）`
                : "手入力レート"}
            </p>
          </>
        )}
      </div>

      <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleManualSubmit}>
        <label className="min-w-0 flex-1 text-sm font-semibold text-slate-800" htmlFor="manual-exchange-rate">
          手入力する場合（1 {currency} あたりの円）
          <input
            id="manual-exchange-rate"
            value={manualRate}
            inputMode="decimal"
            min="0.000000000001"
            step="any"
            className="mt-2 h-12 w-full rounded-xl border border-indigo-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            placeholder="例：150.25"
            type="number"
            onChange={(event) => {
              setManualRate(event.target.value);
              setError(null);
              setMessage(null);
            }}
          />
        </label>
        <button
          type="submit"
          className="min-h-12 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-800 transition hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
        >
          手入力レートを保存
        </button>
      </form>

      {error !== null && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {message !== null && <p role="status" className="mt-3 text-sm font-semibold text-indigo-800">{message}</p>}
      <p className="mt-4 text-xs leading-5 text-slate-500">
        APIはFrankfurterの参照レートを使用します。保存後は「最新レートを取得」または手入力で更新するまで変わりません。
      </p>
    </section>
  );
}

function isExchangeRateApiResponse(value: unknown): value is ExchangeRateApiResponse {
  return (
    isRecord(value) &&
    typeof value.localCurrency === "string" &&
    typeof value.jpyPerCurrency === "string" &&
    typeof value.rateDate === "string" &&
    typeof value.retrievedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
