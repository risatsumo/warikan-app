import { formatMoney } from "@/lib/currencies";
import { calculateSettlement, type MemberSettlement } from "@/lib/settlement";
import type { CurrencyCode, Trip } from "@/types/domain";

interface SettlementSummaryProps {
  readonly trip: Trip;
  readonly onChangeSettlementCurrency: (
    currency: CurrencyCode,
  ) => string | null;
}

const ZERO = BigInt(0);

export function SettlementSummary({
  trip,
  onChangeSettlementCurrency,
}: SettlementSummaryProps) {
  const calculation = calculateSettlement(trip);
  const settlement = calculation.ok ? calculation.settlement : null;
  const selectableCurrencies: readonly CurrencyCode[] =
    trip.localCurrency === "JPY" ? ["JPY"] : ["JPY", trip.localCurrency];

  return (
    <section
      aria-labelledby="settlement-title"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] sm:p-7"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">
            Settlement
          </p>
          <h2
            id="settlement-title"
            className="mt-2 text-2xl font-bold tracking-tight text-slate-950"
          >
            精算結果
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            選んだ通貨へ換算してから、負担額と送金額を計算し直します。
          </p>
        </div>

        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white sm:min-w-48 sm:text-right">
          <p className="text-xs font-semibold tracking-wide text-slate-300">
            総費用
          </p>
          <p className="mt-1 break-words text-2xl font-bold">
            {settlement === null
              ? "—"
              : formatMoney(settlement.totalExpense, settlement.currency)}
          </p>
        </div>
      </div>

      {selectableCurrencies.length > 1 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-700">精算する通貨</p>
          <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            {selectableCurrencies.map((currency) => {
              const selected = trip.settlementCurrency === currency;

              return (
                <button
                  key={currency}
                  type="button"
                  aria-pressed={selected}
                  className={`min-h-10 rounded-lg px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                    selected
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  onClick={() => onChangeSettlementCurrency(currency)}
                >
                  {currency}で精算
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!calculation.ok ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-6 text-amber-900"
        >
          {calculation.error}「旅行設定を編集」から設定してください。
        </div>
      ) : trip.payments.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
          <p className="font-semibold text-slate-800">
            支払いを追加すると精算結果が表示されます
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            支払った人・金額・負担する人から自動で計算します。
          </p>
        </div>
      ) : (
        <>
          <div className="mt-7 space-y-8">
            <section aria-labelledby="transfer-list-title">
              <h3 id="transfer-list-title" className="font-bold text-slate-900">
                送金する内容
              </h3>
              {calculation.settlement.transfers.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
                  <p className="font-bold text-emerald-800">
                    精算する必要はありません
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-700">
                    全員の支払額と負担額が一致しています。
                  </p>
                </div>
              ) : (
                <ul className="mt-3 space-y-3">
                  {calculation.settlement.transfers.map((transfer, index) => (
                    <li
                      key={`${transfer.fromMemberId}-${transfer.toMemberId}-${index}`}
                      className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">
                          送金元 → 送金先
                        </p>
                        <p
                          aria-label={`${transfer.fromMemberName}から${transfer.toMemberName}へ`}
                          className="mt-2 flex flex-wrap items-center gap-2 text-base font-bold"
                        >
                          <span className="min-w-0 break-words rounded-lg bg-amber-100 px-3 py-1.5 text-amber-900">
                            {transfer.fromMemberName}
                          </span>
                          <span aria-hidden="true" className="text-lg text-slate-400">
                            →
                          </span>
                          <span className="min-w-0 break-words rounded-lg bg-sky-100 px-3 py-1.5 text-sky-900">
                            {transfer.toMemberName}
                          </span>
                        </p>
                      </div>
                      <div className="min-w-0 sm:text-right">
                        <p className="text-xs font-semibold text-slate-500">
                          送金額
                        </p>
                        <p className="mt-1 break-words text-2xl font-bold text-emerald-800">
                          {formatMoney(
                            transfer.amount,
                            calculation.settlement.currency,
                          )}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-labelledby="member-settlement-title"
              className="border-t border-slate-200 pt-6"
            >
              <h3
                id="member-settlement-title"
                className="font-bold text-slate-900"
              >
                メンバー別の内訳
              </h3>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {calculation.settlement.members.map((member) => (
                  <li
                    key={member.memberId}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-bold text-slate-900">
                        {member.memberName}
                      </p>
                      <BalanceBadge
                        member={member}
                        currency={calculation.settlement.currency}
                      />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-slate-500">支払った額</dt>
                        <dd className="mt-1 break-words font-semibold text-slate-800">
                          {formatMoney(
                            member.paidAmount,
                            calculation.settlement.currency,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">最終負担額</dt>
                        <dd className="mt-1 break-words font-semibold text-slate-800">
                          {formatMoney(
                            member.burdenAmount,
                            calculation.settlement.currency,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            支払いを選択中の通貨へ換算し、旅行全体の合計に合うよう最小通貨単位で端数を配分しています。通貨を切り替えると換算と丸めも計算し直します。
          </p>
        </>
      )}
    </section>
  );
}

function BalanceBadge({
  member,
  currency,
}: {
  readonly member: MemberSettlement;
  readonly currency: CurrencyCode;
}) {
  if (member.balance > ZERO) {
    return (
      <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
        受け取る {formatMoney(member.balance, currency)}
      </span>
    );
  }

  if (member.balance < ZERO) {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
        支払う {formatMoney(-member.balance, currency)}
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
      差額なし
    </span>
  );
}
