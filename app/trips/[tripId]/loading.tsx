export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div
        aria-live="polite"
        className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)]"
      >
        <p className="text-sm font-semibold text-slate-500">
          旅行詳細を開いています…
        </p>
      </div>
    </div>
  );
}
