import assert from "node:assert/strict";
import test from "node:test";

import { calculateSettlement as calculateSettlementResult } from "./settlement.ts";

const threeMembers = [
  { id: "member-1", name: "りさ" },
  { id: "member-2", name: "さき" },
  { id: "member-3", name: "あき" },
];

function payment({
  id,
  payerId,
  amount,
  currency = "JPY",
  splitAmongMemberIds,
}) {
  return {
    id,
    payerId,
    amountMinor: amount,
    currency,
    description: id,
    splitAmongMemberIds,
  };
}

function calculateSettlement(trip, settlementCurrency) {
  const result = calculateSettlementResult(
    {
      localCurrency: "JPY",
      settlementCurrency: "JPY",
      exchangeRates: [],
      ...trip,
    },
    settlementCurrency,
  );

  assert.equal(result.ok, true);

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.settlement;
}

test("支払いがなければ全員の金額を0円にする", () => {
  const result = calculateSettlement({
    id: "trip-1",
    name: "京都旅行",
    members: threeMembers,
    payments: [],
  });

  assert.equal(result.totalExpense, 0n);
  assert.deepEqual(
    result.members.map((member) => ({
      paid: member.paidAmount,
      burden: member.burdenAmount,
      balance: member.balance,
    })),
    [
      { paid: 0n, burden: 0n, balance: 0n },
      { paid: 0n, burden: 0n, balance: 0n },
      { paid: 0n, burden: 0n, balance: 0n },
    ],
  );
  assert.deepEqual(result.transfers, []);
});

test("10,001円の端数を小数部分と登録順に従って割り当てる", () => {
  const result = calculateSettlement({
    id: "trip-1",
    name: "京都旅行",
    members: threeMembers,
    payments: [
      payment({
        id: "payment-1",
        payerId: "member-1",
        amount: 10001,
        splitAmongMemberIds: threeMembers.map((member) => member.id),
      }),
    ],
  });

  assert.equal(result.totalExpense, 10001n);
  assert.deepEqual(
    result.members.map((member) => member.burdenAmount),
    [3334n, 3334n, 3333n],
  );
  assert.deepEqual(
    result.transfers.map((transfer) => ({
      from: transfer.fromMemberId,
      to: transfer.toMemberId,
      amount: transfer.amount,
    })),
    [
      { from: "member-2", to: "member-1", amount: 3334n },
      { from: "member-3", to: "member-1", amount: 3333n },
    ],
  );
});

test("各支払いを丸めず、旅行全体で合計してから端数処理する", () => {
  const splitAmongMemberIds = threeMembers.map((member) => member.id);
  const result = calculateSettlement({
    id: "trip-1",
    name: "京都旅行",
    members: threeMembers,
    payments: [
      payment({
        id: "payment-1",
        payerId: "member-1",
        amount: 100,
        splitAmongMemberIds,
      }),
      payment({
        id: "payment-2",
        payerId: "member-1",
        amount: 100,
        splitAmongMemberIds,
      }),
      payment({
        id: "payment-3",
        payerId: "member-1",
        amount: 100,
        splitAmongMemberIds,
      }),
    ],
  });

  assert.deepEqual(
    result.members.map((member) => member.burdenAmount),
    [100n, 100n, 100n],
  );
});

test("支払った人と負担する人が異なる立て替えを精算へ反映する", () => {
  const result = calculateSettlement({
    id: "trip-1",
    name: "京都旅行",
    members: threeMembers,
    payments: [
      payment({
        id: "payment-1",
        payerId: "member-1",
        amount: 1200,
        splitAmongMemberIds: ["member-2"],
      }),
    ],
  });

  assert.deepEqual(
    result.members.map((member) => member.burdenAmount),
    [0n, 1200n, 0n],
  );
  assert.deepEqual(result.transfers, [
    {
      fromMemberId: "member-2",
      fromMemberName: "さき",
      toMemberId: "member-1",
      toMemberName: "りさ",
      amount: 1200n,
    },
  ]);
});

test("毎回の残額が大きい支払側と受取側から順番に組み合わせる", () => {
  const members = [
    { id: "member-a", name: "A" },
    { id: "member-b", name: "B" },
    { id: "member-c", name: "C" },
    { id: "member-d", name: "D" },
  ];
  const result = calculateSettlement({
    id: "trip-1",
    name: "京都旅行",
    members,
    payments: [
      payment({
        id: "payment-1",
        payerId: "member-a",
        amount: 8,
        splitAmongMemberIds: ["member-c"],
      }),
      payment({
        id: "payment-2",
        payerId: "member-a",
        amount: 2,
        splitAmongMemberIds: ["member-d"],
      }),
      payment({
        id: "payment-3",
        payerId: "member-b",
        amount: 5,
        splitAmongMemberIds: ["member-d"],
      }),
    ],
  });

  assert.deepEqual(
    result.transfers.map((transfer) => ({
      from: transfer.fromMemberName,
      to: transfer.toMemberName,
      amount: transfer.amount,
    })),
    [
      { from: "C", to: "A", amount: 8n },
      { from: "D", to: "B", amount: 5n },
      { from: "D", to: "A", amount: 2n },
    ],
  );
});

test("負担額の合計は必ず総費用と一致し、全員の差額合計は0円になる", () => {
  const result = calculateSettlement({
    id: "trip-1",
    name: "京都旅行",
    members: threeMembers,
    payments: [
      payment({
        id: "payment-1",
        payerId: "member-1",
        amount: 101,
        splitAmongMemberIds: ["member-1", "member-2", "member-3"],
      }),
      payment({
        id: "payment-2",
        payerId: "member-2",
        amount: 50,
        splitAmongMemberIds: ["member-2", "member-3"],
      }),
      payment({
        id: "payment-3",
        payerId: "member-3",
        amount: 7,
        splitAmongMemberIds: ["member-1", "member-3"],
      }),
    ],
  });

  assert.equal(
    result.members.reduce(
      (total, member) => total + member.burdenAmount,
      0n,
    ),
    result.totalExpense,
  );
  assert.equal(
    result.members.reduce((total, member) => total + member.balance, 0n),
    0n,
  );
});

test("USDの支払いをJPY精算すると換算後の円額から再計算する", () => {
  const result = calculateSettlement({
    id: "trip-usd",
    name: "ニューヨーク旅行",
    localCurrency: "USD",
    settlementCurrency: "JPY",
    exchangeRates: [
      {
        currency: "USD",
        jpyPerCurrency: "150",
        source: "manual",
        rateDate: null,
        updatedAt: "2026-11-21T00:00:00.000Z",
      },
    ],
    members: threeMembers,
    payments: [
      payment({
        id: "payment-usd",
        payerId: "member-1",
        amount: 1000,
        currency: "USD",
        splitAmongMemberIds: threeMembers.map((member) => member.id),
      }),
    ],
  });

  assert.equal(result.currency, "JPY");
  assert.equal(result.totalExpense, 1500n);
  assert.deepEqual(
    result.members.map((member) => member.burdenAmount),
    [500n, 500n, 500n],
  );
});

test("JPYの支払いをUSD精算するとセント単位で換算と丸めをやり直す", () => {
  const result = calculateSettlement({
    id: "trip-usd",
    name: "ニューヨーク旅行",
    localCurrency: "USD",
    settlementCurrency: "USD",
    exchangeRates: [
      {
        currency: "USD",
        jpyPerCurrency: "150",
        source: "manual",
        rateDate: null,
        updatedAt: "2026-11-21T00:00:00.000Z",
      },
    ],
    members: threeMembers,
    payments: [
      payment({
        id: "payment-jpy",
        payerId: "member-1",
        amount: 1000,
        splitAmongMemberIds: threeMembers.map((member) => member.id),
      }),
    ],
  });

  assert.equal(result.currency, "USD");
  assert.equal(result.totalExpense, 667n);
  assert.deepEqual(
    result.members.map((member) => member.burdenAmount),
    [223n, 222n, 222n],
  );
  assert.equal(
    result.members.reduce((total, member) => total + member.balance, 0n),
    0n,
  );
});

test("異なる通貨を換算するレートがなければ精算エラーを返す", () => {
  const result = calculateSettlementResult({
    id: "trip-usd",
    name: "ニューヨーク旅行",
    localCurrency: "USD",
    settlementCurrency: "JPY",
    exchangeRates: [],
    members: threeMembers,
    payments: [
      payment({
        id: "payment-usd",
        payerId: "member-1",
        amount: 1000,
        currency: "USD",
        splitAmongMemberIds: ["member-1", "member-2"],
      }),
    ],
  });

  assert.deepEqual(result, {
    ok: false,
    code: "missing-exchange-rate",
    error: "USDのJPY換算レートを設定してください。",
  });
});

test("現地通貨変更後も旧通貨の支払いをJPY経由で新しい現地通貨へ換算する", () => {
  const result = calculateSettlement({
    id: "trip-eur",
    name: "周遊旅行",
    localCurrency: "EUR",
    settlementCurrency: "EUR",
    exchangeRates: [
      {
        currency: "USD",
        jpyPerCurrency: "150",
        source: "manual",
        rateDate: null,
        updatedAt: "2026-11-21T00:00:00.000Z",
      },
      {
        currency: "EUR",
        jpyPerCurrency: "160",
        source: "manual",
        rateDate: null,
        updatedAt: "2026-11-21T00:00:00.000Z",
      },
    ],
    members: threeMembers,
    payments: [
      payment({
        id: "payment-usd",
        payerId: "member-1",
        amount: 10000,
        currency: "USD",
        splitAmongMemberIds: ["member-1", "member-2"],
      }),
    ],
  });

  assert.equal(result.currency, "EUR");
  assert.equal(result.totalExpense, 9375n);
  assert.deepEqual(
    result.members.map((member) => member.burdenAmount),
    [4688n, 4687n, 0n],
  );
});
