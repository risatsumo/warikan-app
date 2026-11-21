import { useState, type FormEvent } from "react";

import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import type {
  CurrencyCode,
  ExchangeRate,
  Trip,
} from "@/types/domain";

import { CurrencySettings } from "./currency-settings";

interface TripSettingsProps {
  readonly trip: Trip;
  readonly onSaveSettings: (input: {
    readonly name: string;
    readonly localCurrency: CurrencyCode;
    readonly prioritizePayersForRounding: boolean;
  }) => string | null;
  readonly onSaveExchangeRate: (
    exchangeRate: ExchangeRate,
  ) => string | null;
}

export function TripSettings({
  trip,
  onSaveSettings,
  onSaveExchangeRate,
}: TripSettingsProps) {
  const [name, setName] = useState(trip.name);
  const [localCurrency, setLocalCurrency] = useState<CurrencyCode>(
    trip.localCurrency,
  );
  const [prioritizePayersForRounding, setPrioritizePayersForRounding] =
    useState(trip.prioritizePayersForRounding);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const rateCurrencies = collectRateCurrencies(trip);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saveError = onSaveSettings({ name, localCurrency, prioritizePayersForRounding });

    if (saveError !== null) {
      setError(saveError);
      setMessage(null);
      return;
    }

    setError(null);
    setMessage(
      localCurrency === trip.localCurrency
        ? "旅行設定を保存しました。"
        : "現地通貨を変更し、精算通貨をJPYへ戻しました。過去の支払い通貨と金額は保持されています。",
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.25)] sm:p-7">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-600">
          Trip settings
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          旅行の基本設定
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          現地通貨を変更しても、登録済みの支払いは元の通貨と金額のまま残ります。
          変更時は精算通貨をJPYへ戻します。
        </p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="text-sm font-semibold text-slate-800" htmlFor="edit-trip-name">
            旅行名
            <input
              id="edit-trip-name"
              value={name}
              className="mt-2 h-12 w-full rounded-xl border border-sky-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              type="text"
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
                setMessage(null);
              }}
            />
          </label>

          <div className="sm:col-span-2 rounded-2xl border border-sky-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">立て替えた人の負担を軽くする</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">オンにすると、端数の1円・1セントを立替総額が多い人から優先して割り当てます。</p>
              </div>
              <button type="button" role="switch" aria-checked={prioritizePayersForRounding} onClick={() => { setPrioritizePayersForRounding((value) => !value); setError(null); setMessage(null); }} className={`relative h-8 w-14 shrink-0 rounded-full transition ${prioritizePayersForRounding ? "bg-sky-700" : "bg-slate-300"}`}>
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${prioritizePayersForRounding ? "left-7" : "left-1"}`} />
                <span className="sr-only">{prioritizePayersForRounding ? "オン" : "オフ"}</span>
              </button>
            </div>
          </div>

          <label className="text-sm font-semibold text-slate-800" htmlFor="edit-local-currency">
            現在の現地通貨
            <select
              id="edit-local-currency"
              value={localCurrency}
              className="mt-2 h-12 w-full rounded-xl border border-sky-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              onChange={(event) => {
                setLocalCurrency(event.target.value as CurrencyCode);
                setError(null);
                setMessage(null);
              }}
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.name}（{currency.code}）
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2">
            {error !== null && (
              <p role="alert" className="mb-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {message !== null && (
              <p role="status" className="mb-3 text-sm font-semibold text-sky-800">
                {message}
              </p>
            )}
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              基本設定を保存
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="rate-settings-title" className="space-y-4">
        <div className="px-1">
          <h2 id="rate-settings-title" className="text-xl font-bold text-slate-950">
            通貨ごとの為替レート
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            現在の現地通貨と、支払いで使用中の外貨を表示しています。
          </p>
        </div>

        {rateCurrencies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-600">
            日本円だけを使用しているため、為替レートの設定は不要です。
          </div>
        ) : (
          rateCurrencies.map((currency) => (
            <CurrencySettings
              key={currency}
              currency={currency}
              exchangeRate={
                trip.exchangeRates.find(
                  (exchangeRate) => exchangeRate.currency === currency,
                ) ?? null
              }
              onSaveExchangeRate={onSaveExchangeRate}
            />
          ))
        )}
      </section>
    </div>
  );
}

function collectRateCurrencies(trip: Trip): readonly CurrencyCode[] {
  const currencies = new Set<CurrencyCode>();

  if (trip.localCurrency !== "JPY") {
    currencies.add(trip.localCurrency);
  }

  trip.payments.forEach((payment) => {
    if (payment.currency !== "JPY") {
      currencies.add(payment.currency);
    }
  });

  return [...currencies];
}
