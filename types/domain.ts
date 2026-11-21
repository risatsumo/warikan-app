/** アプリで入力・精算できる通貨。 */
export type CurrencyCode =
  | "JPY"
  | "USD"
  | "EUR"
  | "GBP"
  | "KRW"
  | "CNY"
  | "TWD"
  | "THB"
  | "SGD"
  | "AUD";

/** localStorage に保存するアプリ全体のデータ。 */
export interface AppData {
  readonly version: 3;
  readonly trips: readonly Trip[];
}

/** 1つの旅行と、その旅行に属する入力データ。 */
export interface Trip {
  readonly id: string;
  readonly name: string;
  readonly localCurrency: CurrencyCode;
  readonly settlementCurrency: CurrencyCode;
  readonly exchangeRates: readonly ExchangeRate[];
  readonly members: readonly Member[];
  readonly payments: readonly Payment[];
}

/** 1通貨を何円として換算するかを表す。 */
export interface ExchangeRate {
  readonly currency: CurrencyCode;
  readonly jpyPerCurrency: string;
  readonly source: "frankfurter" | "manual";
  readonly rateDate: string | null;
  readonly updatedAt: string;
}

/** 旅行に参加する1人のメンバー。 */
export interface Member {
  readonly id: string;
  readonly name: string;
}

/** 誰が、いくら、何に払い、誰が負担するかを表す支払い。 */
export interface Payment {
  readonly id: string;
  readonly payerId: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly description: string;
  readonly splitAmongMemberIds: readonly string[];
}
