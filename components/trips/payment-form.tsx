import { useState, type FormEvent } from "react";

import {
  createPayment,
  type PaymentValidationErrors,
} from "@/lib/payments";
import type { Member, Payment } from "@/types/domain";

interface PaymentFormProps {
  readonly members: readonly Member[];
  readonly onAddPayment: (payment: Payment) => string | null;
}

export function PaymentForm({ members, onAddPayment }: PaymentFormProps) {
  const [payerId, setPayerId] = useState(members[0]?.id ?? "");
  const [amountYen, setAmountYen] = useState("");
  const [description, setDescription] = useState("");
  const [excludedMemberIds, setExcludedMemberIds] = useState<readonly string[]>(
    [],
  );
  const [errors, setErrors] = useState<PaymentValidationErrors | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const excludedMemberIdSet = new Set(excludedMemberIds);
  const selectedMemberIds = members
    .filter((member) => !excludedMemberIdSet.has(member.id))
    .map((member) => member.id);
  const effectivePayerId = members.some((member) => member.id === payerId)
    ? payerId
    : (members[0]?.id ?? "");

  function clearMessages() {
    setErrors(null);
    setSubmitError(null);
    setSuccessMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const result = createPayment(
      {
        payerId: effectivePayerId,
        amountYen,
        description,
        splitAmongMemberIds: selectedMemberIds,
      },
      members,
    );

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const saveError = onAddPayment(result.payment);

    if (saveError !== null) {
      setSubmitError(saveError);
      return;
    }

    setPayerId(members[0]?.id ?? "");
    setAmountYen("");
    setDescription("");
    setExcludedMemberIds([]);
    setErrors(null);
    setSuccessMessage(`「${result.payment.description}」を追加しました。`);
  }

  function toggleSplitMember(memberId: string, checked: boolean) {
    setExcludedMemberIds((currentIds) =>
      checked
        ? currentIds.filter((currentId) => currentId !== memberId)
        : [...currentIds, memberId],
    );
    clearMessages();
  }

  const inputClassName =
    "mt-2 h-12 w-full rounded-xl border bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4";

  return (
    <form
      className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:p-5"
      noValidate
      onSubmit={handleSubmit}
    >
      <h3 className="font-bold text-slate-900">支払いを追加</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        誰が立て替え、誰が費用を負担するかを入力してください。
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="payment-payer"
            className="text-sm font-semibold text-slate-800"
          >
            支払った人
            <span className="ml-2 text-xs font-medium text-red-600">必須</span>
          </label>
          <select
            id="payment-payer"
            value={effectivePayerId}
            required
            aria-describedby={
              errors?.payerId ? "payment-payer-error" : undefined
            }
            aria-invalid={errors?.payerId !== null && errors !== null}
            className={`${inputClassName} ${
              errors?.payerId
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-slate-300 focus:border-amber-500 focus:ring-amber-100"
            }`}
            onChange={(event) => {
              setPayerId(event.target.value);
              clearMessages();
            }}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {errors?.payerId && (
            <p id="payment-payer-error" className="mt-2 text-sm text-red-700">
              {errors.payerId}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="payment-amount"
            className="text-sm font-semibold text-slate-800"
          >
            金額（円）
            <span className="ml-2 text-xs font-medium text-red-600">必須</span>
          </label>
          <input
            id="payment-amount"
            value={amountYen}
            required
            inputMode="numeric"
            min="1"
            step="1"
            aria-describedby={
              errors?.amountYen ? "payment-amount-error" : undefined
            }
            aria-invalid={errors?.amountYen !== null && errors !== null}
            className={`${inputClassName} ${
              errors?.amountYen
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-slate-300 focus:border-amber-500 focus:ring-amber-100"
            }`}
            placeholder="例：1200"
            type="number"
            onChange={(event) => {
              setAmountYen(event.target.value);
              clearMessages();
            }}
          />
          {errors?.amountYen && (
            <p id="payment-amount-error" className="mt-2 text-sm text-red-700">
              {errors.amountYen}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor="payment-description"
          className="text-sm font-semibold text-slate-800"
        >
          内容
          <span className="ml-2 text-xs font-medium text-red-600">必須</span>
        </label>
        <input
          id="payment-description"
          value={description}
          required
          aria-describedby={
            errors?.description ? "payment-description-error" : undefined
          }
          aria-invalid={errors?.description !== null && errors !== null}
          className={`${inputClassName} ${
            errors?.description
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-amber-500 focus:ring-amber-100"
          }`}
          placeholder="例：宿泊費"
          type="text"
          onChange={(event) => {
            setDescription(event.target.value);
            clearMessages();
          }}
        />
        {errors?.description && (
          <p
            id="payment-description-error"
            className="mt-2 text-sm text-red-700"
          >
            {errors.description}
          </p>
        )}
      </div>

      <fieldset
        aria-describedby={
          errors?.splitAmongMemberIds ? "payment-split-error" : undefined
        }
        className="mt-5"
      >
        <legend className="text-sm font-semibold text-slate-800">
          この費用を負担する人
          <span className="ml-2 text-xs font-medium text-red-600">
            1人以上
          </span>
        </legend>
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            className="min-h-10 rounded-xl px-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
            onClick={() => {
              setExcludedMemberIds([]);
              clearMessages();
            }}
          >
            全員を選択
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {members.map((member) => {
            const checked = !excludedMemberIdSet.has(member.id);

            return (
              <label
                key={member.id}
                className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-amber-100 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-amber-300"
              >
                <input
                  checked={checked}
                  className="h-5 w-5 shrink-0 accent-amber-600"
                  type="checkbox"
                  onChange={(event) =>
                    toggleSplitMember(member.id, event.target.checked)
                  }
                />
                <span className="min-w-0 break-words">{member.name}</span>
              </label>
            );
          })}
        </div>
        {errors?.splitAmongMemberIds && (
          <p
            id="payment-split-error"
            role="alert"
            className="mt-2 text-sm text-red-700"
          >
            {errors.splitAmongMemberIds}
          </p>
        )}
      </fieldset>

      {submitError !== null && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {submitError}
        </p>
      )}
      {successMessage !== null && (
        <p role="status" className="mt-4 text-sm font-semibold text-amber-900">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-base font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
      >
        この支払いを追加
      </button>
    </form>
  );
}
