import type { CurrencyCode } from "../types/domain";

export interface CurrencyDefinition {
  readonly code: CurrencyCode;
  readonly name: string;
  readonly fractionDigits: 0 | 2;
}

export const SUPPORTED_CURRENCIES: readonly CurrencyDefinition[] = [
  { code: "JPY", name: "日本円", fractionDigits: 0 },
  { code: "USD", name: "米ドル", fractionDigits: 2 },
  { code: "EUR", name: "ユーロ", fractionDigits: 2 },
  { code: "GBP", name: "英ポンド", fractionDigits: 2 },
  { code: "KRW", name: "韓国ウォン", fractionDigits: 0 },
  { code: "CNY", name: "中国人民元", fractionDigits: 2 },
  { code: "TWD", name: "台湾ドル", fractionDigits: 2 },
  { code: "THB", name: "タイバーツ", fractionDigits: 2 },
  { code: "SGD", name: "シンガポールドル", fractionDigits: 2 },
  { code: "AUD", name: "オーストラリアドル", fractionDigits: 2 },
];

const currencyDefinitionByCode = new Map(
  SUPPORTED_CURRENCIES.map((currency) => [currency.code, currency]),
);

export function isSupportedCurrencyCode(
  value: unknown,
): value is CurrencyCode {
  return (
    typeof value === "string" &&
    currencyDefinitionByCode.has(value as CurrencyCode)
  );
}

export function getCurrencyDefinition(
  currency: CurrencyCode,
): CurrencyDefinition {
  const definition = currencyDefinitionByCode.get(currency);

  if (definition === undefined) {
    throw new Error(`未対応の通貨です: ${currency}`);
  }

  return definition;
}

export function getCurrencyFractionDigits(currency: CurrencyCode): 0 | 2 {
  return getCurrencyDefinition(currency).fractionDigits;
}

export function getCurrencyInputStep(currency: CurrencyCode): "1" | "0.01" {
  return getCurrencyFractionDigits(currency) === 0 ? "1" : "0.01";
}

export function parseMoneyInput(
  value: string,
  currency: CurrencyCode,
): number | null {
  const normalizedValue = value.trim();
  const fractionDigits = getCurrencyFractionDigits(currency);
  const pattern =
    fractionDigits === 0 ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/;

  if (!pattern.test(normalizedValue)) {
    return null;
  }

  const [majorPart, enteredFractionPart = ""] = normalizedValue.split(".");
  const paddedFractionPart = enteredFractionPart.padEnd(fractionDigits, "0");

  try {
    const factor = BigInt(10 ** fractionDigits);
    const amountMinor =
      BigInt(majorPart) * factor + BigInt(paddedFractionPart || "0");

    if (
      amountMinor < BigInt(1) ||
      amountMinor > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      return null;
    }

    return Number(amountMinor);
  } catch {
    return null;
  }
}

export function formatMoney(
  amountMinor: bigint | number,
  currency: CurrencyCode,
): string {
  const fractionDigits = getCurrencyFractionDigits(currency);
  const factor = 10 ** fractionDigits;
  const numericAmount = Number(amountMinor) / factor;

  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numericAmount);
}
