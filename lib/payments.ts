import {
  getCurrencyDefinition,
  getCurrencyFractionDigits,
  parseMoneyInput,
} from "./currencies.ts";
import type {
  AppData,
  CurrencyCode,
  Member,
  Payment,
  PaymentItem,
  Trip,
} from "../types/domain";

export interface CreatePaymentInput {
  readonly payerId: string;
  readonly amount: string;
  readonly currency: CurrencyCode;
  readonly description: string;
  readonly splitAmongMemberIds: readonly string[];
  readonly items?: readonly {
    readonly description: string;
    readonly amount: string;
    readonly splitAmongMemberIds: readonly string[];
  }[];
}

export interface PaymentValidationErrors {
  readonly payerId: string | null;
  readonly amount: string | null;
  readonly currency: string | null;
  readonly description: string | null;
  readonly splitAmongMemberIds: string | null;
  readonly items?: string | null;
}

export type CreatePaymentResult =
  | { readonly ok: true; readonly payment: Payment }
  | { readonly ok: false; readonly errors: PaymentValidationErrors };

export type AddPaymentResult =
  | { readonly ok: true; readonly data: AppData; readonly trip: Trip }
  | { readonly ok: false; readonly error: string };

export type RemovePaymentResult =
  | { readonly ok: true; readonly data: AppData; readonly trip: Trip }
  | { readonly ok: false; readonly error: string };

export type UpdatePaymentResult =
  | { readonly ok: true; readonly data: AppData; readonly trip: Trip }
  | { readonly ok: false; readonly error: string };

type CreateId = () => string;

export function createPayment(
  input: CreatePaymentInput,
  members: readonly Member[],
  localCurrency: CurrencyCode = "JPY",
  createId: CreateId = () => crypto.randomUUID(),
): CreatePaymentResult {
  return createPaymentWithAllowedCurrencies(
    input,
    members,
    ["JPY", localCurrency],
    createId,
  );
}

/**
 * 既存の支払いを編集用入力から作り直す。
 * 旅行の現地通貨を変更済みでも、元の支払い通貨は保持・再選択できる。
 */
export function createUpdatedPayment(
  input: CreatePaymentInput,
  members: readonly Member[],
  localCurrency: CurrencyCode,
  currentPayment: Payment,
): CreatePaymentResult {
  return createPaymentWithAllowedCurrencies(
    input,
    members,
    ["JPY", localCurrency, currentPayment.currency],
    currentPayment.id,
  );
}

function createPaymentWithAllowedCurrencies(
  input: CreatePaymentInput,
  members: readonly Member[],
  allowedCurrencyList: readonly CurrencyCode[],
  paymentId: string | CreateId,
): CreatePaymentResult {
  const memberIds = new Set(members.map((member) => member.id));
  const allowedCurrencies = new Set<CurrencyCode>(allowedCurrencyList);
  const isAllowedCurrency = allowedCurrencies.has(input.currency);
  const amountMinor = isAllowedCurrency
    ? parseMoneyInput(input.amount, input.currency)
    : null;
  const hasDuplicateSplitMembers =
    new Set(input.splitAmongMemberIds).size !==
    input.splitAmongMemberIds.length;
  const hasUnknownSplitMember = input.splitAmongMemberIds.some(
    (memberId) => !memberIds.has(memberId),
  );

  let itemError: string | null = null;
  const itemized = input.items?.map((item) => {
    const itemAmount = isAllowedCurrency
      ? parseMoneyInput(item.amount, input.currency)
      : null;
    const itemMemberIds = new Set(item.splitAmongMemberIds);
    const itemHasInvalidMembers =
      item.splitAmongMemberIds.length === 0 ||
      itemMemberIds.size !== item.splitAmongMemberIds.length ||
      item.splitAmongMemberIds.some((memberId) => !memberIds.has(memberId));
    if (
      item.description.trim() === "" ||
      itemAmount === null ||
      itemHasInvalidMembers
    ) return null;
    return {
      description: item.description.trim(),
      amountMinor: itemAmount,
      splitAmongMemberIds: members
        .filter((member) => itemMemberIds.has(member.id))
        .map((member) => member.id),
    };
  });
  const hasValidItems = itemized !== undefined && itemized.length > 0 && itemized.every((item) => item !== null);
  const itemTotal = hasValidItems
    ? itemized.reduce((total, item) => total + (item?.amountMinor ?? 0), 0)
    : null;
  if (input.items !== undefined && !hasValidItems) {
    itemError = "品目名・金額・負担する人を確認してください。";
  }
  if (itemTotal !== null && (!Number.isSafeInteger(itemTotal) || itemTotal < 1)) {
    itemError = "品目の合計金額が上限を超えています。";
  }
  const errors: PaymentValidationErrors = {
    payerId: memberIds.has(input.payerId)
      ? null
      : "支払った人を選択してください。",
    amount:
      amountMinor === null
        ? createAmountErrorMessage(input.currency)
        : null,
    currency: isAllowedCurrency
      ? null
      : "この旅行で使える通貨を選択してください。",
    description:
      input.description.trim() === ""
        ? "支払いの内容を入力してください。"
        : null,
    splitAmongMemberIds:
      input.splitAmongMemberIds.length === 0
        ? "費用を負担する人を1人以上選択してください。"
        : hasDuplicateSplitMembers || hasUnknownSplitMember
          ? "費用を負担する人を正しく選択してください。"
          : null,
    items: itemError,
  };
  const hasErrors = Object.values(errors).some((error) => error !== null);

  if (hasErrors || (itemTotal === null && amountMinor === null)) {
    return { ok: false, errors };
  }

  const resolvedPaymentId = typeof paymentId === "string" ? paymentId : paymentId();
  const selectedMemberIds = new Set(input.splitAmongMemberIds);
  const items: readonly PaymentItem[] = hasValidItems
    ? itemized.map((item, index) => ({
        id: `${resolvedPaymentId}-item-${index + 1}`,
        ...item!,
      }))
    : [{
        id: `${resolvedPaymentId}-item-1`,
        description: input.description.trim(),
        amountMinor: amountMinor!,
        splitAmongMemberIds: members
          .filter((member) => selectedMemberIds.has(member.id))
          .map((member) => member.id),
      }];
  const itemMembers = new Set(items.flatMap((item) => item.splitAmongMemberIds));

  return {
    ok: true,
    payment: {
      id: resolvedPaymentId,
      payerId: input.payerId,
      amountMinor: items.reduce((total, item) => total + item.amountMinor, 0),
      currency: input.currency,
      description: input.description.trim(),
      splitAmongMemberIds: members.filter((member) => itemMembers.has(member.id)).map((member) => member.id),
      items,
    },
  };
}

export function addPaymentToTrip(
  appData: AppData,
  tripId: string,
  payment: Payment,
): AddPaymentResult {
  const trip = appData.trips.find((currentTrip) => currentTrip.id === tripId);

  if (trip === undefined) {
    return { ok: false, error: "旅行が見つかりません。" };
  }

  if (trip.payments.some((currentPayment) => currentPayment.id === payment.id)) {
    return { ok: false, error: "同じ支払いがすでに登録されています。" };
  }

  const memberIds = new Set(trip.members.map((member) => member.id));
  const allowedCurrencies = new Set<CurrencyCode>([
    "JPY",
    trip.localCurrency,
  ]);

  if (
    !memberIds.has(payment.payerId) ||
    !allowedCurrencies.has(payment.currency) ||
    payment.splitAmongMemberIds.length === 0 ||
    payment.splitAmongMemberIds.some((memberId) => !memberIds.has(memberId))
  ) {
    return { ok: false, error: "参加者が正しくない支払いは登録できません。" };
  }

  const updatedTrip: Trip = {
    ...trip,
    payments: [...trip.payments, payment],
  };

  return {
    ok: true,
    data: {
      ...appData,
      trips: appData.trips.map((currentTrip) =>
        currentTrip.id === tripId ? updatedTrip : currentTrip,
      ),
    },
    trip: updatedTrip,
  };
}

export function removePaymentFromTrip(
  appData: AppData,
  tripId: string,
  paymentId: string,
): RemovePaymentResult {
  const trip = appData.trips.find((currentTrip) => currentTrip.id === tripId);

  if (trip === undefined) {
    return { ok: false, error: "旅行が見つかりません。" };
  }

  if (!trip.payments.some((payment) => payment.id === paymentId)) {
    return { ok: false, error: "削除する支払いが見つかりません。" };
  }

  const updatedTrip: Trip = {
    ...trip,
    payments: trip.payments.filter((payment) => payment.id !== paymentId),
  };

  return {
    ok: true,
    data: {
      ...appData,
      trips: appData.trips.map((currentTrip) =>
        currentTrip.id === tripId ? updatedTrip : currentTrip,
      ),
    },
    trip: updatedTrip,
  };
}

export function updatePaymentInTrip(
  appData: AppData,
  tripId: string,
  payment: Payment,
): UpdatePaymentResult {
  const trip = appData.trips.find((currentTrip) => currentTrip.id === tripId);

  if (trip === undefined) {
    return { ok: false, error: "旅行が見つかりません。" };
  }

  const currentPayment = trip.payments.find(
    (tripPayment) => tripPayment.id === payment.id,
  );

  if (currentPayment === undefined) {
    return { ok: false, error: "編集する支払いが見つかりません。" };
  }

  const memberIds = new Set(trip.members.map((member) => member.id));
  const allowedCurrencies = new Set<CurrencyCode>([
    "JPY",
    trip.localCurrency,
    currentPayment.currency,
  ]);
  const hasDuplicateSplitMembers =
    new Set(payment.splitAmongMemberIds).size !==
    payment.splitAmongMemberIds.length;

  if (
    !memberIds.has(payment.payerId) ||
    !allowedCurrencies.has(payment.currency) ||
    !Number.isSafeInteger(payment.amountMinor) ||
    payment.amountMinor < 1 ||
    payment.description.trim() === "" ||
    payment.splitAmongMemberIds.length === 0 ||
    hasDuplicateSplitMembers ||
    payment.splitAmongMemberIds.some((memberId) => !memberIds.has(memberId))
  ) {
    return {
      ok: false,
      error: "支払いの内容が正しくないため更新できません。",
    };
  }

  const updatedTrip: Trip = {
    ...trip,
    payments: trip.payments.map((tripPayment) =>
      tripPayment.id === payment.id ? payment : tripPayment,
    ),
  };

  return {
    ok: true,
    data: {
      ...appData,
      trips: appData.trips.map((currentTrip) =>
        currentTrip.id === tripId ? updatedTrip : currentTrip,
      ),
    },
    trip: updatedTrip,
  };
}

function createAmountErrorMessage(currency: CurrencyCode): string {
  const definition = getCurrencyDefinition(currency);
  const unitDescription =
    getCurrencyFractionDigits(currency) === 0 ? "1通貨単位" : "0.01通貨単位";

  return `金額は${unitDescription}以上の${definition.code}で入力してください。`;
}
