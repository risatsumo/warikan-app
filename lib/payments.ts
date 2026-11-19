import type { AppData, Member, Payment, Trip } from "../types/domain";

export interface CreatePaymentInput {
  readonly payerId: string;
  readonly amountYen: string;
  readonly description: string;
  readonly splitAmongMemberIds: readonly string[];
}

export interface PaymentValidationErrors {
  readonly payerId: string | null;
  readonly amountYen: string | null;
  readonly description: string | null;
  readonly splitAmongMemberIds: string | null;
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

type CreateId = () => string;

export function createPayment(
  input: CreatePaymentInput,
  members: readonly Member[],
  createId: CreateId = () => crypto.randomUUID(),
): CreatePaymentResult {
  const memberIds = new Set(members.map((member) => member.id));
  const amountMinor = parsePositiveYen(input.amountYen);
  const hasDuplicateSplitMembers =
    new Set(input.splitAmongMemberIds).size !==
    input.splitAmongMemberIds.length;
  const hasUnknownSplitMember = input.splitAmongMemberIds.some(
    (memberId) => !memberIds.has(memberId),
  );

  const errors: PaymentValidationErrors = {
    payerId: memberIds.has(input.payerId)
      ? null
      : "支払った人を選択してください。",
    amountYen:
      amountMinor === null
        ? "金額は1円以上の整数で入力してください。"
        : null,
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
  };
  const hasErrors = Object.values(errors).some((error) => error !== null);

  if (hasErrors || amountMinor === null) {
    return { ok: false, errors };
  }

  const selectedMemberIds = new Set(input.splitAmongMemberIds);

  return {
    ok: true,
    payment: {
      id: createId(),
      payerId: input.payerId,
      amountMinor,
      currency: "JPY",
      description: input.description.trim(),
      splitAmongMemberIds: members
        .filter((member) => selectedMemberIds.has(member.id))
        .map((member) => member.id),
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

  if (
    !memberIds.has(payment.payerId) ||
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

function parsePositiveYen(value: string): number | null {
  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const amount = Number(normalizedValue);

  return Number.isSafeInteger(amount) && amount >= 1 ? amount : null;
}
