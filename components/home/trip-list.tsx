import type { Trip } from "@/types/domain";

interface TripListProps {
  readonly isLoading: boolean;
  readonly trips: readonly Trip[];
}

export function TripList({ isLoading, trips }: TripListProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">
            Your trips
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            旅行一覧
          </h2>
        </div>
        {!isLoading && trips.length > 0 && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {trips.length}件
          </span>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div
            aria-live="polite"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500"
          >
            旅行データを読み込んでいます…
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <div
              aria-hidden="true"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm"
            >
              🧳
            </div>
            <p className="mt-4 font-semibold text-slate-800">
              まだ旅行がありません
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              最初の旅行を作成すると、ここに新しい順で表示されます。
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {trips.map((trip) => (
              <li
                key={trip.id}
                className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <p className="break-words font-bold text-slate-900">{trip.name}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>{trip.members.length}人</span>
                  <span>{trip.payments.length}件の支払い</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
