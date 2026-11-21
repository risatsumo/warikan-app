import { formatMoney } from "./currencies.ts";
import type { SettlementResult } from "./settlement.ts";

/** 精算結果をメッセージアプリなどへ貼り付けやすい文章にする。 */
export function createSettlementCopyText(
  tripName: string,
  settlement: SettlementResult,
): string {
  const headingLines = [
    `【${tripName}の精算】`,
    `精算通貨：${settlement.currency}`,
    "",
  ];

  if (settlement.transfers.length === 0) {
    return [...headingLines, "精算する必要はありません。"].join("\n");
  }

  return [
    ...headingLines,
    ...settlement.transfers.map(
      (transfer) =>
        `${transfer.fromMemberName} → ${transfer.toMemberName}：${formatMoney(
          transfer.amount,
          settlement.currency,
        )}`,
    ),
  ].join("\n");
}
