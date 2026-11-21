import { isSupportedCurrencyCode } from "./currencies.ts";
import { createExchangeRate } from "./exchange-rates.ts";
import type {
  AppData,
  CurrencyCode,
  ExchangeRate,
  Member,
  Trip,
} from "../types/domain";

const MINIMUM_MEMBER_COUNT = 2;

export interface CreateTripInput {
  readonly name: string;
  readonly localCurrency: CurrencyCode;
  readonly memberNames: readonly string[];
}

export interface CreateTripValidationErrors {
  readonly tripName: string | null;
  readonly localCurrency: string | null;
  readonly memberCount: string | null;
  readonly memberNames: readonly (string | null)[];
}

export interface UpdateTripSettingsInput {
  readonly name: string;
  readonly localCurrency: CurrencyCode;
}

export type CreateTripResult =
  | { readonly ok: true; readonly trip: Trip }
  | { readonly ok: false; readonly errors: CreateTripValidationErrors };

export type AddMemberResult =
  | {
      readonly ok: true;
      readonly data: AppData;
      readonly trip: Trip;
      readonly member: Member;
    }
  | { readonly ok: false; readonly error: string };

export type RemoveMemberResult =
  | {
      readonly ok: true;
      readonly data: AppData;
      readonly trip: Trip;
    }
  | { readonly ok: false; readonly error: string };

export type UpdateTripResult =
  | { readonly ok: true; readonly data: AppData; readonly trip: Trip }
  | { readonly ok: false; readonly error: string };

type CreateId = () => string;

export function validateCreateTripInput(
  input: CreateTripInput,
): CreateTripValidationErrors {
  const normalizedMemberNames = input.memberNames.map((name) => name.trim());
  const memberNameErrors: (string | null)[] = normalizedMemberNames.map(() => null);
  const firstIndexByName = new Map<string, number>();

  normalizedMemberNames.forEach((name, index) => {
    if (name === "") {
      memberNameErrors[index] = "メンバー名を入力してください。";
      return;
    }

    const firstIndex = firstIndexByName.get(name);

    if (firstIndex === undefined) {
      firstIndexByName.set(name, index);
      return;
    }

    const duplicateMessage = "同じ名前のメンバーは登録できません。";
    memberNameErrors[firstIndex] = duplicateMessage;
    memberNameErrors[index] = duplicateMessage;
  });

  const enteredMemberCount = normalizedMemberNames.filter(
    (name) => name !== "",
  ).length;

  return {
    tripName: input.name.trim() === "" ? "旅行名を入力してください。" : null,
    localCurrency: isSupportedCurrencyCode(input.localCurrency)
      ? null
      : "現地通貨を選択してください。",
    memberCount:
      enteredMemberCount < MINIMUM_MEMBER_COUNT
        ? "メンバーを2人以上入力してください。"
        : null,
    memberNames: memberNameErrors,
  };
}

export function createTrip(
  input: CreateTripInput,
  createId: CreateId = () => crypto.randomUUID(),
): CreateTripResult {
  const errors = validateCreateTripInput(input);
  const hasErrors =
    errors.tripName !== null ||
    errors.localCurrency !== null ||
    errors.memberCount !== null ||
    errors.memberNames.some((error) => error !== null);

  if (hasErrors) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    trip: {
      id: createId(),
      name: input.name.trim(),
      localCurrency: input.localCurrency,
      settlementCurrency: "JPY",
      exchangeRates: [],
      members: input.memberNames.map((name) => ({
        id: createId(),
        name: name.trim(),
      })),
      payments: [],
    },
  };
}

export function updateTripSettings(
  appData: AppData,
  tripId: string,
  input: UpdateTripSettingsInput,
): UpdateTripResult {
  const trip = findTripById(appData, tripId);

  if (trip === null) {
    return { ok: false, error: "旅行が見つかりません。" };
  }

  const normalizedName = input.name.trim();

  if (normalizedName === "") {
    return { ok: false, error: "旅行名を入力してください。" };
  }

  if (!isSupportedCurrencyCode(input.localCurrency)) {
    return { ok: false, error: "現地通貨を正しく選択してください。" };
  }

  const localCurrencyChanged = trip.localCurrency !== input.localCurrency;

  return replaceTrip(appData, {
    ...trip,
    name: normalizedName,
    localCurrency: input.localCurrency,
    settlementCurrency: localCurrencyChanged
      ? "JPY"
      : trip.settlementCurrency,
  });
}

export function updateTripSettlementCurrency(
  appData: AppData,
  tripId: string,
  settlementCurrency: CurrencyCode,
): UpdateTripResult {
  const trip = findTripById(appData, tripId);

  if (trip === null) {
    return { ok: false, error: "旅行が見つかりません。" };
  }

  if (
    settlementCurrency !== "JPY" &&
    settlementCurrency !== trip.localCurrency
  ) {
    return { ok: false, error: "この旅行で使えない精算通貨です。" };
  }

  return replaceTrip(appData, {
    ...trip,
    settlementCurrency,
  });
}

export function updateTripExchangeRate(
  appData: AppData,
  tripId: string,
  exchangeRate: ExchangeRate,
): UpdateTripResult {
  const trip = findTripById(appData, tripId);

  if (trip === null) {
    return { ok: false, error: "旅行が見つかりません。" };
  }

  const validatedRate = createExchangeRate(exchangeRate);

  if (validatedRate === null) {
    return { ok: false, error: "為替レートの形式が正しくありません。" };
  }

  return replaceTrip(appData, {
    ...trip,
    exchangeRates: trip.exchangeRates.some(
      (rate) => rate.currency === validatedRate.currency,
    )
      ? trip.exchangeRates.map((rate) =>
          rate.currency === validatedRate.currency ? validatedRate : rate,
        )
      : [...trip.exchangeRates, validatedRate],
  });
}

function replaceTrip(appData: AppData, trip: Trip): UpdateTripResult {
  return {
    ok: true,
    data: {
      ...appData,
      trips: appData.trips.map((currentTrip) =>
        currentTrip.id === trip.id ? trip : currentTrip,
      ),
    },
    trip,
  };
}

export function addTrip(appData: AppData, trip: Trip): AppData {
  return {
    ...appData,
    trips: [trip, ...appData.trips],
  };
}

export function removeTrip(appData: AppData, tripId: string): AppData {
  return {
    ...appData,
    trips: appData.trips.filter((trip) => trip.id !== tripId),
  };
}

export function removeAllTrips(appData: AppData): AppData {
  return {
    ...appData,
    trips: [],
  };
}

export function findTripById(appData: AppData, tripId: string): Trip | null {
  return appData.trips.find((trip) => trip.id === tripId) ?? null;
}

export function addMemberToTrip(
  appData: AppData,
  tripId: string,
  memberName: string,
  createId: CreateId = () => crypto.randomUUID(),
): AddMemberResult {
  const trip = findTripById(appData, tripId);

  if (trip === null) {
    return { ok: false, error: "旅行が見つかりません。" };
  }

  const normalizedName = memberName.trim();

  if (normalizedName === "") {
    return { ok: false, error: "メンバー名を入力してください。" };
  }

  if (trip.members.some((member) => member.name === normalizedName)) {
    return {
      ok: false,
      error: "同じ名前のメンバーは登録できません。",
    };
  }

  const member: Member = {
    id: createId(),
    name: normalizedName,
  };
  const updatedTrip: Trip = {
    ...trip,
    members: [...trip.members, member],
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
    member,
  };
}

export function removeMemberFromTrip(
  appData: AppData,
  tripId: string,
  memberId: string,
): RemoveMemberResult {
  const trip = findTripById(appData, tripId);

  if (trip === null) {
    return { ok: false, error: "旅行が見つかりません。" };
  }

  if (!trip.members.some((member) => member.id === memberId)) {
    return { ok: false, error: "削除するメンバーが見つかりません。" };
  }

  if (trip.members.length <= MINIMUM_MEMBER_COUNT) {
    return {
      ok: false,
      error:
        "旅行には2人以上のメンバーが必要です。別のメンバーを追加してから削除してください。",
    };
  }

  const isUsedByPayment = trip.payments.some(
    (payment) =>
      payment.payerId === memberId ||
      payment.splitAmongMemberIds.includes(memberId),
  );

  if (isUsedByPayment) {
    return {
      ok: false,
      error:
        "このメンバーを含む支払いがあります。該当する支払いを先に削除してください。",
    };
  }

  const updatedTrip: Trip = {
    ...trip,
    members: trip.members.filter((member) => member.id !== memberId),
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
