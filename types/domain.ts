/**
 * 国内旅行で最初に対応する通貨。
 * 複数通貨機能を実装するときに、対応する通貨コードを追加する。
 */
export type CurrencyCode = "JPY";

/** localStorage に保存するアプリ全体のデータ。 */
export interface AppData {
  readonly version: 1;
  readonly trips: readonly Trip[];
}

/** 1つの旅行と、その旅行に属する入力データ。 */
export interface Trip {
  readonly id: string;
  readonly name: string;
  readonly members: readonly Member[];
  readonly payments: readonly Payment[];
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
