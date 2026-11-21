import { useState, type FormEvent } from "react";

import {
  createPayment,
  createUpdatedPayment,
  type PaymentValidationErrors,
} from "@/lib/payments";
import {
  formatMoneyInput,
  getCurrencyFractionDigits,
  getCurrencyInputStep,
} from "@/lib/currencies";
import type { CurrencyCode, Member, Payment } from "@/types/domain";

interface PaymentFormProps {
  readonly members: readonly Member[];
  readonly localCurrency: CurrencyCode;
  readonly paymentToEdit?: Payment;
  readonly onSavePayment: (payment: Payment) => string | null;
  readonly onCancelEdit?: () => void;
}

export function PaymentForm({
  members,
  localCurrency,
  paymentToEdit,
  onSavePayment,
  onCancelEdit,
}: PaymentFormProps) {
  const isEditing = paymentToEdit !== undefined;
  const inputIdPrefix = isEditing
    ? `payment-edit-${paymentToEdit.id}`
    : "payment-add";
  const [payerId, setPayerId] = useState(
    paymentToEdit?.payerId ?? members[0]?.id ?? "",
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    paymentToEdit?.currency ?? localCurrency,
  );
  const [amount, setAmount] = useState(
    paymentToEdit === undefined
      ? ""
      : formatMoneyInput(paymentToEdit.amountMinor, paymentToEdit.currency),
  );
  const [description, setDescription] = useState(
    paymentToEdit?.description ?? "",
  );
  const [excludedMemberIds, setExcludedMemberIds] = useState<readonly string[]>(
    paymentToEdit === undefined
      ? []
      : members
          .filter(
            (member) =>
              !paymentToEdit.splitAmongMemberIds.includes(member.id),
          )
          .map((member) => member.id),
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
  const paymentCurrencies: readonly CurrencyCode[] = Array.from(
    new Set<CurrencyCode>(
      paymentToEdit === undefined
        ? [localCurrency, "JPY"]
        : [paymentToEdit.currency, localCurrency, "JPY"],
    ),
  );

  function clearMessages() {
    setErrors(null);
    setSubmitError(null);
    setSuccessMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const input = {
      payerId: effectivePayerId,
      amount,
      currency,
      description,
      splitAmongMemberIds: selectedMemberIds,
    };
    const result =
      paymentToEdit === undefined
        ? createPayment(input, members, localCurrency)
        : createUpdatedPayment(
            input,
            members,
            localCurrency,
            paymentToEdit,
          );

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const saveError = onSavePayment(result.payment);

    if (saveError !== null) {
      setSubmitError(saveError);
      return;
    }

    setErrors(null);

    if (isEditing) {
      return;
    }

    setPayerId(members[0]?.id ?? "");
    setCurrency(localCurrency);
    setAmount("");
    setDescription("");
    setExcludedMemberIds([]);
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
      className={`rounded-2xl border p-4 sm:p-5 ${
        isEditing
          ? "border-sky-200 bg-white"
          : "mt-6 border-amber-100 bg-amber-50/60"
      }`}
      noValidate
      onSubmit={handleSubmit}
    >
      <h3 className="font-bold text-slate-900">
        {isEditing ? "支払いを編集" : "支払いを追加"}
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        {isEditing
          ? "変更後の内容で保存すると、精算結果も自動で計算し直します。"
          : "誰が立て替え、誰が費用を負担するかを入力してください。"}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor={`${inputIdPrefix}-payer`}
            className="text-sm font-semibold text-slate-800"
          >
            支払った人
            <span className="ml-2 text-xs font-medium text-red-600">必須</span>
          </label>
          <select
            id={`${inputIdPrefix}-payer`}
            value={effectivePayerId}
            required
            aria-describedby={
              errors?.payerId ? `${inputIdPrefix}-payer-error` : undefined
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
            <p
              id={`${inputIdPrefix}-payer-error`}
              className="mt-2 text-sm text-red-700"
            >
              {errors.payerId}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`${inputIdPrefix}-currency`}
            className="text-sm font-semibold text-slate-800"
          >
            支払い通貨
            <span className="ml-2 text-xs font-medium text-red-600">必須</span>
          </label>
          <select
            id={`${inputIdPrefix}-currency`}
            value={currency}
            aria-describedby={
              errors?.currency
                ? `${inputIdPrefix}-currency-error`
                : undefined
            }
            aria-invalid={Boolean(errors?.currency)}
            className={`${inputClassName} ${
              errors?.currency
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-slate-300 focus:border-amber-500 focus:ring-amber-100"
            }`}
            onChange={(event) => {
              setCurrency(event.target.value as CurrencyCode);
              setAmount("");
              clearMessages();
            }}
          >
            {paymentCurrencies.map((currencyCode) => (
              <option key={currencyCode} value={currencyCode}>
                {currencyCode}
              </option>
            ))}
          </select>
          {errors?.currency && (
            <p
              id={`${inputIdPrefix}-currency-error`}
              className="mt-2 text-sm text-red-700"
            >
              {errors.currency}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`${inputIdPrefix}-amount`}
            className="text-sm font-semibold text-slate-800"
          >
            金額（{currency}）
            <span className="ml-2 text-xs font-medium text-red-600">必須</span>
          </label>
          <input
            id={`${inputIdPrefix}-amount`}
            value={amount}
            required
            inputMode={
              getCurrencyFractionDigits(currency) === 0 ? "numeric" : "decimal"
            }
            min={getCurrencyInputStep(currency)}
            step={getCurrencyInputStep(currency)}
            aria-describedby={
              errors?.amount ? `${inputIdPrefix}-amount-error` : undefined
            }
            aria-invalid={errors?.amount !== null && errors !== null}
            className={`${inputClassName} ${
              errors?.amount
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-slate-300 focus:border-amber-500 focus:ring-amber-100"
            }`}
            placeholder={
              getCurrencyFractionDigits(currency) === 0 ? "例：1200" : "例：12.50"
            }
            type="number"
            onChange={(event) => {
              setAmount(event.target.value);
              clearMessages();
            }}
          />
          {errors?.amount && (
            <p
              id={`${inputIdPrefix}-amount-error`}
              className="mt-2 text-sm text-red-700"
            >
              {errors.amount}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor={`${inputIdPrefix}-description`}
          className="text-sm font-semibold text-slate-800"
        >
          内容
          <span className="ml-2 text-xs font-medium text-red-600">必須</span>
        </label>
        <input
          id={`${inputIdPrefix}-description`}
          value={description}
          required
          aria-describedby={
            errors?.description
              ? `${inputIdPrefix}-description-error`
              : undefined
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
            id={`${inputIdPrefix}-description-error`}
            className="mt-2 text-sm text-red-700"
          >
            {errors.description}
          </p>
        )}
      </div>

      <fieldset
        aria-describedby={
          errors?.splitAmongMemberIds
            ? `${inputIdPrefix}-split-error`
            : undefined
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
            id={`${inputIdPrefix}-split-error`}
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

      <div className={`mt-5 grid gap-3 ${isEditing ? "sm:grid-cols-2" : ""}`}>
        {isEditing && onCancelEdit !== undefined && (
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
            onClick={onCancelEdit}
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-base font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        >
          {isEditing ? "変更を保存" : "この支払いを追加"}
        </button>
      </div>
    </form>
  );
}
