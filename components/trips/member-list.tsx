import type { Member } from "@/types/domain";

import { MemberForm } from "./member-form";

interface MemberListProps {
  readonly members: readonly Member[];
  readonly onAddMember: (memberName: string) => string | null;
  readonly deleteError: string | null;
  readonly onRequestDeleteMember: (member: Member) => void;
}

export function MemberList({
  members,
  onAddMember,
  deleteError,
  onRequestDeleteMember,
}: MemberListProps) {
  return (
    <section
      aria-labelledby="member-list-title"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-600">
            Members
          </p>
          <h2
            id="member-list-title"
            className="mt-2 text-2xl font-bold tracking-tight text-slate-950"
          >
            参加者
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
          {members.length}人
        </span>
      </div>

      <MemberForm onAddMember={onAddMember} />

      {deleteError !== null && (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {deleteError}
        </p>
      )}

      <ol className="mt-6 space-y-3">
        {members.map((member, index) => (
          <li
            key={member.id}
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-sky-700 shadow-sm"
            >
              {index + 1}
            </span>
            <span className="min-w-0 break-words font-semibold text-slate-800">
              {member.name}
            </span>
            <button
              type="button"
              aria-label={`「${member.name}」を削除`}
              className="ml-auto min-h-11 shrink-0 rounded-xl px-3 text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
              onClick={() => onRequestDeleteMember(member)}
            >
              削除
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
