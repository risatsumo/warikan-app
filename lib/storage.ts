import { isSupportedCurrencyCode } from "./currencies.ts";
import { createExchangeRate } from "./exchange-rates.ts";
import type {
  AppData,
  ExchangeRate,
  Member,
  Payment,
  Trip,
} from "../types/domain";

export const APP_DATA_STORAGE_KEY = "warikan-app:data";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StorageError {
  readonly code: "load-failed" | "invalid-data" | "save-failed";
  readonly message: string;
}

export type LoadAppDataResult =
  | { readonly ok: true; readonly data: AppData }
  | {
      readonly ok: false;
      readonly data: AppData;
      readonly error: StorageError;
    };

export type SaveAppDataResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: StorageError };

export function createEmptyAppData(): AppData {
  return { version: 4, trips: [] };
}

export function loadAppData(storage: StorageAdapter): LoadAppDataResult {
  let storedValue: string | null;

  try {
    storedValue = storage.getItem(APP_DATA_STORAGE_KEY);
  } catch {
    return {
      ok: false,
      data: createEmptyAppData(),
      error: {
        code: "load-failed",
        message:
          "保存データを読み込めませんでした。ブラウザーの設定を確認してください。",
      },
    };
  }

  if (storedValue === null) {
    return { ok: true, data: createEmptyAppData() };
  }

  try {
    const parsedData: unknown = JSON.parse(storedValue);

    const appData = parseAppData(parsedData);

    if (appData === null) {
      return invalidDataResult();
    }

    return { ok: true, data: appData };
  } catch {
    return invalidDataResult();
  }
}

export function saveAppData(
  storage: StorageAdapter,
  data: AppData,
): SaveAppDataResult {
  if (!isAppData(data)) {
    return {
      ok: false,
      error: {
        code: "invalid-data",
        message: "正しくない形式のデータは保存できません。",
      },
    };
  }

  try {
    storage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: {
        code: "save-failed",
        message:
          "データを保存できませんでした。ブラウザーの空き容量や設定を確認してください。",
      },
    };
  }
}

function invalidDataResult(): LoadAppDataResult {
  return {
    ok: false,
    data: createEmptyAppData(),
    error: {
      code: "invalid-data",
      message:
        "保存データの形式が正しくないため、新しいデータとして開始します。",
    },
  };
}

function parseAppData(value: unknown): AppData | null {
  if (!isRecord(value) || !Array.isArray(value.trips)) {
    return null;
  }

  if (value.version === 4 && value.trips.every(isTrip)) {
    const appData = value as unknown as AppData;

    return hasUniqueStrings(appData.trips.map((trip) => trip.id))
      ? { version: 4, trips: appData.trips.map((trip) => ({ ...trip, prioritizePayersForRounding: false })) }
      : null;
  }

  if (value.version === 3 && value.trips.every(isVersion3Trip)) {
    const version3Trips = value.trips as (Omit<Trip, "prioritizePayersForRounding">)[];
    if (!hasUniqueStrings(version3Trips.map((trip) => trip.id))) return null;
    return { version: 4, trips: version3Trips.map((trip) => ({ ...trip, prioritizePayersForRounding: false })) };
  }

  if (value.version === 2 && value.trips.every(isVersion2Trip)) {
    const version2Trips = value.trips as Version2Trip[];

    if (!hasUniqueStrings(version2Trips.map((trip) => trip.id))) {
      return null;
    }

    return {
      version: 4,
      trips: version2Trips.map((trip) => ({
        id: trip.id,
        name: trip.name,
        localCurrency: trip.localCurrency,
        settlementCurrency: trip.settlementCurrency,
        exchangeRates:
          trip.exchangeRate === null
            ? []
            : [
                {
                  currency: trip.localCurrency,
                  jpyPerCurrency: trip.exchangeRate.jpyPerLocalCurrency,
                  source: trip.exchangeRate.source,
                  rateDate: trip.exchangeRate.rateDate,
                  updatedAt: trip.exchangeRate.updatedAt,
                },
              ],
        members: trip.members,
        payments: trip.payments,
        prioritizePayersForRounding: false,
      })),
    };
  }

  if (value.version === 1 && value.trips.every(isLegacyTrip)) {
    const legacyTrips = value.trips as LegacyTrip[];

    if (!hasUniqueStrings(legacyTrips.map((trip) => trip.id))) {
      return null;
    }

    return {
      version: 4,
      trips: legacyTrips.map((trip) => ({
        ...trip,
        localCurrency: "JPY",
        settlementCurrency: "JPY",
        exchangeRates: [],
        prioritizePayersForRounding: false,
      })),
    };
  }

  return null;
}

function isAppData(value: unknown): value is AppData {
  if (!isRecord(value) || value.version !== 4 || !Array.isArray(value.trips)) {
    return false;
  }

  if (!value.trips.every(isTrip)) {
    return false;
  }

  return hasUniqueStrings(value.trips.map((trip) => trip.id));
}

function isTrip(value: unknown): value is Trip {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isSupportedCurrencyCode(value.localCurrency) ||
    !isSupportedCurrencyCode(value.settlementCurrency) ||
    (value.settlementCurrency !== "JPY" &&
      value.settlementCurrency !== value.localCurrency) ||
    !Array.isArray(value.exchangeRates) ||
    !value.exchangeRates.every(isExchangeRate) ||
    typeof value.prioritizePayersForRounding !== "boolean" ||
    !Array.isArray(value.members) ||
    !Array.isArray(value.payments) ||
    value.members.length < 2 ||
    !value.members.every(isMember)
  ) {
    return false;
  }

  const memberIds = value.members.map((member) => member.id);
  const memberNames = value.members.map((member) => member.name);

  if (!hasUniqueStrings(memberIds) || !hasUniqueStrings(memberNames)) {
    return false;
  }

  const memberIdSet = new Set(memberIds);

  if (
    !hasUniqueStrings(
      value.exchangeRates.map((exchangeRate) => exchangeRate.currency),
    )
  ) {
    return false;
  }

  if (
    !value.payments.every((payment) => isPayment(payment, memberIdSet))
  ) {
    return false;
  }

  return hasUniqueStrings(value.payments.map((payment) => payment.id));
}

function isVersion3Trip(value: unknown): value is Omit<Trip, "prioritizePayersForRounding"> {
  if (!isRecord(value)) return false;
  const legacyTrip = { ...value };
  delete legacyTrip.prioritizePayersForRounding;
  return isTrip({ ...legacyTrip, prioritizePayersForRounding: false });
}

function isMember(value: unknown): value is Member {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name)
  );
}

function isPayment(
  value: unknown,
  memberIds: ReadonlySet<string>,
): value is Payment {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.payerId) ||
    !memberIds.has(value.payerId) ||
    typeof value.amountMinor !== "number" ||
    !Number.isSafeInteger(value.amountMinor) ||
    value.amountMinor <= 0 ||
    !isSupportedCurrencyCode(value.currency) ||
    !isNonEmptyString(value.description) ||
    !Array.isArray(value.splitAmongMemberIds) ||
    value.splitAmongMemberIds.length === 0 ||
    !value.splitAmongMemberIds.every(
      (memberId) => typeof memberId === "string" && memberIds.has(memberId),
    )
  ) {
    return false;
  }

  return hasUniqueStrings(value.splitAmongMemberIds);
}

interface Version2ExchangeRate {
  readonly jpyPerLocalCurrency: string;
  readonly source: ExchangeRate["source"];
  readonly rateDate: string | null;
  readonly updatedAt: string;
}

interface Version2Trip {
  readonly id: string;
  readonly name: string;
  readonly localCurrency: Trip["localCurrency"];
  readonly settlementCurrency: Trip["settlementCurrency"];
  readonly exchangeRate: Version2ExchangeRate | null;
  readonly members: readonly Member[];
  readonly payments: readonly Payment[];
}

function isVersion2Trip(value: unknown): value is Version2Trip {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isSupportedCurrencyCode(value.localCurrency) ||
    !isSupportedCurrencyCode(value.settlementCurrency) ||
    (value.settlementCurrency !== "JPY" &&
      value.settlementCurrency !== value.localCurrency) ||
    !isVersion2ExchangeRate(value.exchangeRate, value.localCurrency) ||
    !Array.isArray(value.members) ||
    !Array.isArray(value.payments) ||
    value.members.length < 2 ||
    !value.members.every(isMember)
  ) {
    return false;
  }

  const memberIds = value.members.map((member) => member.id);
  const memberNames = value.members.map((member) => member.name);

  if (!hasUniqueStrings(memberIds) || !hasUniqueStrings(memberNames)) {
    return false;
  }

  const memberIdSet = new Set(memberIds);

  return (
    value.payments.every(
      (payment) =>
        isPayment(payment, memberIdSet) &&
        (payment.currency === "JPY" ||
          payment.currency === value.localCurrency),
    ) && hasUniqueStrings(value.payments.map((payment) => payment.id))
  );
}

function isVersion2ExchangeRate(
  value: unknown,
  localCurrency: Trip["localCurrency"],
): value is Version2ExchangeRate | null {
  if (localCurrency === "JPY") {
    return value === null;
  }

  if (
    value === null ||
    !isRecord(value) ||
    (value.source !== "frankfurter" && value.source !== "manual") ||
    (value.rateDate !== null && typeof value.rateDate !== "string") ||
    typeof value.jpyPerLocalCurrency !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return value === null;
  }

  return createExchangeRate({
    currency: localCurrency,
    jpyPerCurrency: value.jpyPerLocalCurrency,
    source: value.source,
    rateDate: value.rateDate,
    updatedAt: value.updatedAt,
  }) !== null;
}

interface LegacyTrip {
  readonly id: string;
  readonly name: string;
  readonly members: readonly Member[];
  readonly payments: readonly Payment[];
}

function isLegacyTrip(value: unknown): value is LegacyTrip {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !Array.isArray(value.members) ||
    !Array.isArray(value.payments) ||
    value.members.length < 2 ||
    !value.members.every(isMember)
  ) {
    return false;
  }

  const memberIds = value.members.map((member) => member.id);
  const memberNames = value.members.map((member) => member.name);

  if (!hasUniqueStrings(memberIds) || !hasUniqueStrings(memberNames)) {
    return false;
  }

  const memberIdSet = new Set(memberIds);

  return (
    value.payments.every(
      (payment) =>
        isPayment(payment, memberIdSet) && payment.currency === "JPY",
    ) && hasUniqueStrings(value.payments.map((payment) => payment.id))
  );
}

function isExchangeRate(value: unknown): value is ExchangeRate {
  if (
    !isRecord(value) ||
    !isSupportedCurrencyCode(value.currency) ||
    value.currency === "JPY" ||
    (value.source !== "frankfurter" && value.source !== "manual") ||
    (value.rateDate !== null && typeof value.rateDate !== "string") ||
    typeof value.jpyPerCurrency !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }

  return createExchangeRate({
    currency: value.currency,
    jpyPerCurrency: value.jpyPerCurrency,
    source: value.source,
    rateDate: value.rateDate,
    updatedAt: value.updatedAt,
  }) !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function hasUniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}
