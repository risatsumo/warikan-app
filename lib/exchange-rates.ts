import type { CurrencyCode, ExchangeRate } from "../types/domain";

export interface RateFraction {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export interface FrankfurterRate {
  readonly localCurrency: CurrencyCode;
  readonly jpyPerLocalCurrency: string;
  readonly rateDate: string;
}

export function normalizePositiveExchangeRate(value: string): string | null {
  const trimmedValue = value.trim();

  if (!/^\d+(?:\.\d{1,12})?$/.test(trimmedValue)) {
    return null;
  }

  const [integerPart, fractionPart = ""] = trimmedValue.split(".");
  const normalizedIntegerPart = integerPart.replace(/^0+(?=\d)/, "");
  const normalizedFractionPart = fractionPart.replace(/0+$/, "");
  const normalizedValue =
    normalizedFractionPart === ""
      ? normalizedIntegerPart
      : `${normalizedIntegerPart}.${normalizedFractionPart}`;

  if (/^0(?:\.0+)?$/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

export function exchangeRateToFraction(value: string): RateFraction | null {
  const normalizedValue = normalizePositiveExchangeRate(value);

  if (normalizedValue === null) {
    return null;
  }

  const [integerPart, fractionPart = ""] = normalizedValue.split(".");
  const denominator = BigInt(10 ** fractionPart.length);
  const numerator = BigInt(`${integerPart}${fractionPart}`);
  const divisor = greatestCommonDivisor(numerator, denominator);

  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

export function createExchangeRate(input: {
  readonly jpyPerLocalCurrency: string;
  readonly source: ExchangeRate["source"];
  readonly rateDate: string | null;
  readonly updatedAt: string;
}): ExchangeRate | null {
  const normalizedRate = normalizePositiveExchangeRate(
    input.jpyPerLocalCurrency,
  );

  if (
    normalizedRate === null ||
    !isValidDateTime(input.updatedAt) ||
    (input.rateDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.rateDate))
  ) {
    return null;
  }

  return {
    jpyPerLocalCurrency: normalizedRate,
    source: input.source,
    rateDate: input.rateDate,
    updatedAt: input.updatedAt,
  };
}

export function parseFrankfurterRateResponse(
  value: unknown,
  expectedLocalCurrency: CurrencyCode,
): FrankfurterRate | null {
  if (
    !isRecord(value) ||
    value.base !== expectedLocalCurrency ||
    value.quote !== "JPY" ||
    typeof value.rate !== "number" ||
    !Number.isFinite(value.rate) ||
    value.rate <= 0 ||
    typeof value.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
  ) {
    return null;
  }

  const normalizedRate = normalizePositiveExchangeRate(String(value.rate));

  return normalizedRate === null
    ? null
    : {
        localCurrency: expectedLocalCurrency,
        jpyPerLocalCurrency: normalizedRate,
        rateDate: value.date,
      };
}

function isValidDateTime(value: string): boolean {
  return value.trim() !== "" && !Number.isNaN(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let currentLeft = left;
  let currentRight = right;

  while (currentRight !== BigInt(0)) {
    const remainder = currentLeft % currentRight;
    currentLeft = currentRight;
    currentRight = remainder;
  }

  return currentLeft;
}
