import { useState, type FormEvent } from "react";

interface MemberFormProps {
  readonly onAddMember: (memberName: string) => string | null;
}

export function MemberForm({ onAddMember }: MemberFormProps) {
  const [memberName, setMemberName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const addError = onAddMember(memberName);

    if (addError !== null) {
      setError(addError);
      return;
    }

    const normalizedName = memberName.trim();
    setMemberName("");
    setSuccessMessage(`${normalizedName}さんを追加しました。`);
  }

  return (
    <form
      className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/70 p-4"
      noValidate
      onSubmit={handleSubmit}
    >
      <label
        htmlFor="new-member-name"
        className="text-sm font-semibold text-slate-800"
      >
        新しい参加者
        <span className="ml-2 text-xs font-medium text-red-600">必須</span>
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="new-member-name"
          value={memberName}
          required
          aria-describedby={error !== null ? "new-member-name-error" : undefined}
          aria-invalid={error !== null}
          autoComplete="off"
          className={`h-12 min-w-0 flex-1 rounded-xl border bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error !== null
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-sky-500 focus:ring-sky-100"
          }`}
          placeholder="例：あき"
          type="text"
          onChange={(event) => {
            setMemberName(event.target.value);
            setError(null);
            setSuccessMessage(null);
          }}
        />
        <button
          type="submit"
          className="min-h-12 shrink-0 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        >
          参加者を追加
        </button>
      </div>

      {error !== null && (
        <p
          id="new-member-name-error"
          role="alert"
          className="mt-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {successMessage !== null && (
        <p role="status" className="mt-2 text-sm font-semibold text-sky-800">
          {successMessage}
        </p>
      )}
    </form>
  );
}
