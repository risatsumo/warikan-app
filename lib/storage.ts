import type { AppData, Member, Payment, Trip } from "../types/domain";

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
  return { version: 1, trips: [] };
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

    if (!isAppData(parsedData)) {
      return invalidDataResult();
    }

    return { ok: true, data: parsedData };
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

function isAppData(value: unknown): value is AppData {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.trips)) {
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

  if (!value.payments.every((payment) => isPayment(payment, memberIdSet))) {
    return false;
  }

  return hasUniqueStrings(value.payments.map((payment) => payment.id));
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
    value.currency !== "JPY" ||
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function hasUniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}
