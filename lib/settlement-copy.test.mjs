import assert from "node:assert/strict";
import test from "node:test";

import { formatMoney } from "./currencies.ts";
import { createSettlementCopyText } from "./settlement-copy.ts";

test("旅行名・精算通貨・送金内容をコピー用の文章にする", () => {
  const settlement = {
    currency: "JPY",
    totalExpense: 3000n,
    members: [],
    transfers: [
      {
        fromMemberId: "member-1",
        fromMemberName: "さき",
        toMemberId: "member-2",
        toMemberName: "りさ",
        amount: 1500n,
      },
    ],
  };

  assert.equal(
    createSettlementCopyText("沖縄旅行", settlement),
    [
      "【沖縄旅行の精算】",
      "精算通貨：JPY",
      "",
      `さき → りさ：${formatMoney(1500n, "JPY")}`,
    ].join("\n"),
  );
});

test("送金不要の結果も共有できる文章にする", () => {
  const settlement = {
    currency: "USD",
    totalExpense: 0n,
    members: [],
    transfers: [],
  };

  assert.equal(
    createSettlementCopyText("ハワイ旅行", settlement),
    [
      "【ハワイ旅行の精算】",
      "精算通貨：USD",
      "",
      "精算する必要はありません。",
    ].join("\n"),
  );
});
