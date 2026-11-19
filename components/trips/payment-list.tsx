import type { Member, Payment } from "@/types/domain";

interface PaymentListProps {
  readonly members: readonly Member[];
  readonly payments: readonly Payment[];
}

const yenFormatter = new Intl.NumberFormat("ja-JP");

export function PaymentList({ members, payments }: PaymentListProps) {
  const memberNameById = new Map(
    members.map((member) => [member.id, member.name]),
  );

  return (
    <section
      aria-labelledby="payment-list-title"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">
            Payments
          </p>
          <h2
            id="payment-list-title"
            className="mt-2 text-2xl font-bold tracking-tight text-slate-950"
          >
            支払い
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
          {payments.length}件
        </span>
      </div>

      <div className="mt-6">
        {payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <div
              aria-hidden="true"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm"
            >
              🧾
            </div>
            <p className="mt-4 font-semibold text-slate-800">
              まだ支払いがありません
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              立て替えた費用を登録すると、ここに一覧で表示されます。
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <p className="min-w-0 break-words font-bold text-slate-900">
                    {payment.description}
                  </p>
                  <p className="shrink-0 font-bold text-slate-950">
                    {yenFormatter.format(payment.amountMinor)}円
                  </p>
                </div>
                <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                  {memberNameById.get(payment.payerId)}さんが支払い
                </p>
                <p className="break-words text-sm leading-6 text-slate-500">
                  負担する人：
                  {payment.splitAmongMemberIds
                    .map((memberId) => memberNameById.get(memberId))
                    .join("、")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
