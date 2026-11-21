import assert from "node:assert/strict";
import test from "node:test";

import {
  addPaymentToTrip,
  createPayment,
  removePaymentFromTrip,
} from "./payments.ts";

const members = [
  { id: "member-1", name: "りさ" },
  { id: "member-2", name: "さき" },
  { id: "member-3", name: "あき" },
];

const validInput = {
  payerId: "member-1",
  amount: "1200",
  currency: "JPY",
  description: "昼食代",
  splitAmongMemberIds: ["member-1", "member-2", "member-3"],
};

test("支払い内容を整えて1円単位の支払いデータを作成する", () => {
  const result = createPayment(
    {
      ...validInput,
      amount: " 1200 ",
      description: "  昼食代  ",
      splitAmongMemberIds: ["member-3", "member-1"],
    },
    members,
    "JPY",
    () => "payment-1",
  );

  assert.deepEqual(result, {
    ok: true,
    payment: {
      id: "payment-1",
      payerId: "member-1",
      amountMinor: 1200,
      currency: "JPY",
      description: "昼食代",
      splitAmongMemberIds: ["member-1", "member-3"],
    },
  });
});

test("空欄・0円・マイナス・小数・指数表記・大きすぎる金額を拒否する", () => {
  const invalidAmounts = [
    "",
    "0",
    "-1",
    "1.5",
    "1e3",
    "9007199254740992",
  ];

  invalidAmounts.forEach((amount) => {
    const result = createPayment({ ...validInput, amount }, members);

    assert.equal(result.ok, false);

    if (!result.ok) {
      assert.equal(
        result.errors.amount,
        "金額は1通貨単位以上のJPYで入力してください。",
      );
    }
  });
});

test("空白だけの内容と未選択の負担者を拒否する", () => {
  const result = createPayment(
    {
      ...validInput,
      description: "   ",
      splitAmongMemberIds: [],
    },
    members,
  );

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(
      result.errors.description,
      "支払いの内容を入力してください。",
    );
    assert.equal(
      result.errors.splitAmongMemberIds,
      "費用を負担する人を1人以上選択してください。",
    );
  }
});

test("旅行にいない支払者や負担者を拒否する", () => {
  const result = createPayment(
    {
      ...validInput,
      payerId: "unknown-member",
      splitAmongMemberIds: ["member-1", "unknown-member"],
    },
    members,
  );

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.errors.payerId, "支払った人を選択してください。");
    assert.equal(
      result.errors.splitAmongMemberIds,
      "費用を負担する人を正しく選択してください。",
    );
  }
});

test("旅行の末尾へ支払いを追加し、元の旅行は変更しない", () => {
  const trip = {
    id: "trip-1",
    name: "京都旅行",
    localCurrency: "JPY",
    settlementCurrency: "JPY",
    exchangeRates: [],
    members,
    payments: [],
  };
  const appData = { version: 3, trips: [trip] };
  const createResult = createPayment(
    validInput,
    members,
    "JPY",
    () => "payment-1",
  );

  assert.equal(createResult.ok, true);

  if (!createResult.ok) {
    return;
  }

  const result = addPaymentToTrip(appData, trip.id, createResult.payment);

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.deepEqual(result.trip.payments, [createResult.payment]);
    assert.equal(appData.trips[0].payments.length, 0);
  }
});

test("指定した支払いだけを削除し、元の旅行は変更しない", () => {
  const firstPayment = {
    id: "payment-1",
    payerId: "member-1",
    amountMinor: 1200,
    currency: "JPY",
    description: "昼食代",
    splitAmongMemberIds: ["member-1", "member-2"],
  };
  const secondPayment = {
    id: "payment-2",
    payerId: "member-2",
    amountMinor: 900,
    currency: "JPY",
    description: "入場料",
    splitAmongMemberIds: ["member-1", "member-2"],
  };
  const trip = {
    id: "trip-1",
    name: "京都旅行",
    localCurrency: "JPY",
    settlementCurrency: "JPY",
    exchangeRates: [],
    members,
    payments: [firstPayment, secondPayment],
  };
  const appData = { version: 3, trips: [trip] };

  const result = removePaymentFromTrip(appData, trip.id, firstPayment.id);

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.deepEqual(result.trip.payments, [secondPayment]);
    assert.equal(appData.trips[0].payments.length, 2);
  }
});

test("存在しない支払いは削除せずエラーを返す", () => {
  const trip = {
    id: "trip-1",
    name: "京都旅行",
    localCurrency: "JPY",
    settlementCurrency: "JPY",
    exchangeRates: [],
    members,
    payments: [],
  };
  const appData = { version: 3, trips: [trip] };

  const result = removePaymentFromTrip(appData, trip.id, "missing-payment");

  assert.deepEqual(result, {
    ok: false,
    error: "削除する支払いが見つかりません。",
  });
});

test("現地通貨の小数を最小通貨単位へ変換する", () => {
  const result = createPayment(
    {
      ...validInput,
      amount: "12.50",
      currency: "USD",
    },
    members,
    "USD",
    () => "payment-usd",
  );

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.payment.amountMinor, 1250);
    assert.equal(result.payment.currency, "USD");
  }
});

test("旅行の現地通貨でも日本円でもない支払いを拒否する", () => {
  const result = createPayment(
    { ...validInput, currency: "EUR" },
    members,
    "USD",
  );

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(
      result.errors.currency,
      "この旅行で使える通貨を選択してください。",
    );
  }
});
