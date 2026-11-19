import assert from "node:assert/strict";
import test from "node:test";

import { calculateSettlement } from "./settlement.ts";

const threeMembers = [
  { id: "member-1", name: "りさ" },
  { id: "member-2", name: "さき" },
  { id: "member-3", name: "あき" },
];

function payment({
  id,
  payerId,
  amount,
  splitAmongMemberIds,
}) {
  return {
    id,
    payerId,
    amountMinor: amount,
    currency: "JPY",
    description: id,
    splitAmongMemberIds,
  };
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
