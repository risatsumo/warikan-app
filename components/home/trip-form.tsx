import { useState, type FormEvent } from "react";

import {
  createTrip,
  type CreateTripValidationErrors,
} from "@/lib/trips";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import type { CurrencyCode, Trip } from "@/types/domain";

interface TripFormProps {
  readonly disabled: boolean;
  readonly onCreateTrip: (trip: Trip) => string | null;
}

const INITIAL_MEMBER_NAMES = ["", ""] as const;

export function TripForm({ disabled, onCreateTrip }: TripFormProps) {
  const [tripName, setTripName] = useState("");
  const [localCurrency, setLocalCurrency] = useState<CurrencyCode>("JPY");
  const [memberNames, setMemberNames] = useState<readonly string[]>(
    INITIAL_MEMBER_NAMES,
  );
  const [errors, setErrors] = useState<CreateTripValidationErrors | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const result = createTrip({ name: tripName, localCurrency, memberNames });

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const saveError = onCreateTrip(result.trip);

    if (saveError !== null) {
      setSubmitError(saveError);
      return;
    }

    setTripName("");
    setLocalCurrency("JPY");
    setMemberNames(INITIAL_MEMBER_NAMES);
    setErrors(null);
  }

  function updateMemberName(index: number, value: string) {
    setMemberNames((currentNames) =>
      currentNames.map((name, currentIndex) =>
        currentIndex === index ? value : name,
      ),
    );
    setErrors(null);
  }

  function addMemberField() {
    setMemberNames((currentNames) => [...currentNames, ""]);
    setErrors(null);
  }

  function removeMemberField(index: number) {
    setMemberNames((currentNames) =>
      currentNames.filter((_, currentIndex) => currentIndex !== index),
    );
    setErrors(null);
  }

  const inputClassName =
    "mt-2 h-12 w-full rounded-xl border bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] sm:p-7">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-600">
          New trip
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          新しい旅行を作成
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          旅行名と、一緒に精算するメンバーを入力してください。
        </p>
      </div>

      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-semibold text-slate-800" htmlFor="trip-name">
            旅行名
            <span className="ml-2 text-xs font-medium text-red-600">必須</span>
          </label>
          <input
            id="trip-name"
            value={tripName}
            disabled={disabled}
            aria-describedby={errors?.tripName ? "trip-name-error" : undefined}
            aria-invalid={errors?.tripName !== null && errors !== null}
            className={`${inputClassName} ${
              errors?.tripName
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-100"
            }`}
            placeholder="例：京都旅行"
            type="text"
            onChange={(event) => {
              setTripName(event.target.value);
              setErrors(null);
            }}
          />
          {errors?.tripName && (
            <p id="trip-name-error" className="mt-2 text-sm text-red-700">
              {errors.tripName}
            </p>
          )}
        </div>

        <div>
          <label
            className="text-sm font-semibold text-slate-800"
            htmlFor="trip-local-currency"
          >
            現地通貨
            <span className="ml-2 text-xs font-medium text-red-600">必須</span>
          </label>
          <select
            id="trip-local-currency"
            value={localCurrency}
            disabled={disabled}
            aria-describedby={
              errors?.localCurrency ? "trip-local-currency-error" : undefined
            }
            aria-invalid={Boolean(errors?.localCurrency)}
            className={`${inputClassName} ${
              errors?.localCurrency
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-slate-300 focus:border-sky-500 focus:ring-sky-100"
            }`}
            onChange={(event) => {
              setLocalCurrency(event.target.value as CurrencyCode);
              setErrors(null);
            }}
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.name}（{currency.code}）
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            日本円とここで選んだ通貨で支払いを登録できます。
          </p>
          {errors?.localCurrency && (
            <p id="trip-local-currency-error" className="mt-2 text-sm text-red-700">
              {errors.localCurrency}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">
            メンバー
            <span className="ml-2 text-xs font-medium text-red-600">
              2人以上
            </span>
          </legend>

          <div className="mt-3 space-y-3">
            {memberNames.map((memberName, index) => {
              const error = errors?.memberNames[index];
              const inputId = `member-name-${index}`;
              const errorId = `${inputId}-error`;

              return (
                <div key={index}>
                  <div className="flex items-end gap-2">
                    <label className="min-w-0 flex-1 text-sm text-slate-600" htmlFor={inputId}>
                      メンバー {index + 1}
                      <input
                        id={inputId}
                        value={memberName}
                        disabled={disabled}
                        aria-describedby={error ? errorId : undefined}
                        aria-invalid={Boolean(error)}
                        autoComplete="off"
                        className={`${inputClassName} ${
                          error
                            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                            : "border-slate-300 focus:border-sky-500 focus:ring-sky-100"
                        }`}
                        placeholder="名前を入力"
                        type="text"
                        onChange={(event) =>
                          updateMemberName(index, event.target.value)
                        }
                      />
                    </label>

                    {memberNames.length > 2 && (
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={`メンバー ${index + 1} の入力欄を削除`}
                        className="flex h-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => removeMemberField(index)}
                      >
                        削除
                      </button>
                    )}
                  </div>
                  {error && (
                    <p id={errorId} className="mt-2 text-sm text-red-700">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {errors?.memberCount && (
            <p className="mt-3 text-sm text-red-700">{errors.memberCount}</p>
          )}

          <button
            type="button"
            disabled={disabled}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={addMemberField}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ＋
            </span>
            メンバーを追加
          </button>
        </fieldset>

        {submitError && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-base font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-200 disabled:cursor-wait disabled:bg-slate-400"
        >
          {disabled ? "保存データを読み込み中…" : "この内容で旅行を作成"}
        </button>
      </form>
    </section>
  );
}
