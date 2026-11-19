import { calculateSettlement, type MemberSettlement } from "@/lib/settlement";
import type { Trip } from "@/types/domain";

interface SettlementSummaryProps {
  readonly trip: Trip;
}

const ZERO = BigInt(0);
const yenFormatter = new Intl.NumberFormat("ja-JP");

export function SettlementSummary({ trip }: SettlementSummaryProps) {
  const settlement = calculateSettlement(trip);

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
            支払いをもとに、最終的な負担額と送金先を計算します。
          </p>
        </div>

        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white sm:min-w-48 sm:text-right">
          <p className="text-xs font-semibold tracking-wide text-slate-300">
            総費用
          </p>
          <p className="mt-1 break-words text-2xl font-bold">
            {formatYen(settlement.totalExpense)}
          </p>
        </div>
      </div>

      {trip.payments.length === 0 ? (
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
          <div className="mt-7 grid items-start gap-6 lg:grid-cols-2">
            <section aria-labelledby="member-settlement-title">
              <h3
                id="member-settlement-title"
                className="font-bold text-slate-900"
              >
                メンバー別の内訳
              </h3>
              <ul className="mt-3 space-y-3">
                {settlement.members.map((member) => (
                  <li
                    key={member.memberId}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-bold text-slate-900">
                        {member.memberName}
                      </p>
                      <BalanceBadge member={member} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-slate-500">支払った額</dt>
                        <dd className="mt-1 break-words font-semibold text-slate-800">
                          {formatYen(member.paidAmount)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">最終負担額</dt>
                        <dd className="mt-1 break-words font-semibold text-slate-800">
                          {formatYen(member.burdenAmount)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="transfer-list-title">
              <h3 id="transfer-list-title" className="font-bold text-slate-900">
                送金する内容
              </h3>
              {settlement.transfers.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
                  <p className="font-bold text-emerald-800">
                    精算する必要はありません
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-700">
                    全員の支払額と負担額が一致しています。
                  </p>
                </div>
              ) : (
                <ol className="mt-3 space-y-3">
                  {settlement.transfers.map((transfer, index) => (
                    <li
                      key={`${transfer.fromMemberId}-${transfer.toMemberId}-${index}`}
                      className="flex min-w-0 items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-emerald-700 shadow-sm"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="break-words text-sm leading-6 text-slate-700">
                          <span className="font-bold text-slate-950">
                            {transfer.fromMemberName}さん
                          </span>
                          から、
                          <span className="font-bold text-slate-950">
                            {transfer.toMemberName}さん
                          </span>
                          へ
                        </p>
                        <p className="mt-1 break-words text-xl font-bold text-emerald-800">
                          {formatYen(transfer.amount)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            各メンバーの負担額は、支払いごとの端数を丸めず、旅行全体で合計してから1円単位に調整しています。
          </p>
        </>
      )}
    </section>
  );
}

function BalanceBadge({ member }: { readonly member: MemberSettlement }) {
  if (member.balance > ZERO) {
    return (
      <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
        受け取る {formatYen(member.balance)}
      </span>
    );
  }

  if (member.balance < ZERO) {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
        支払う {formatYen(-member.balance)}
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
      差額なし
    </span>
  );
}

function formatYen(amount: bigint): string {
  return `${yenFormatter.format(amount)}円`;
}
