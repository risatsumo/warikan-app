import { HomeScreen } from "@/components/home/home-screen";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_48%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_42%)]"
      />

      <header className="relative mx-auto w-full max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-sm font-semibold text-sky-700 shadow-sm backdrop-blur">
              <span aria-hidden="true">✈</span>
              旅行費用をすっきり精算
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              旅の割り勘
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              旅行とメンバーを登録して、立て替えた費用を分かりやすく整理しましょう。
            </p>
          </div>

          <p className="flex max-w-sm items-start gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm backdrop-blur">
            <span aria-hidden="true" className="mt-0.5 text-base">
              🔒
            </span>
            データはこの端末のブラウザー内だけに保存されます。
          </p>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <HomeScreen />
      </main>
    </div>
  );
}
