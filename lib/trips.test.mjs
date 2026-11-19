import assert from "node:assert/strict";
import test from "node:test";

import {
  addMemberToTrip,
  addTrip,
  createTrip,
  findTripById,
  removeAllTrips,
  removeMemberFromTrip,
  removeTrip,
  validateCreateTripInput,
} from "./trips.ts";

const firstTrip = {
  id: "trip-1",
  name: "京都旅行",
  members: [],
  payments: [],
};

const secondTrip = {
  id: "trip-2",
  name: "沖縄旅行",
  members: [],
  payments: [],
};

test("旅行名とメンバー名の前後の空白を取り除いて旅行を作成する", () => {
  const ids = ["trip-1", "member-1", "member-2"];
  const result = createTrip(
    {
      name: "  京都旅行  ",
      memberNames: ["  りさ  ", "さき"],
    },
    () => ids.shift(),
  );

  assert.deepEqual(result, {
    ok: true,
    trip: {
      id: "trip-1",
      name: "京都旅行",
      members: [
        { id: "member-1", name: "りさ" },
        { id: "member-2", name: "さき" },
      ],
      payments: [],
    },
  });
});

test("空欄の旅行名とメンバー名をエラーにする", () => {
  const errors = validateCreateTripInput({
    name: "   ",
    memberNames: ["", "   "],
  });

  assert.deepEqual(errors, {
    tripName: "旅行名を入力してください。",
    memberCount: "メンバーを2人以上入力してください。",
    memberNames: [
      "メンバー名を入力してください。",
      "メンバー名を入力してください。",
    ],
  });
});

test("前後の空白を除いた後に同じになるメンバー名をエラーにする", () => {
  const errors = validateCreateTripInput({
    name: "京都旅行",
    memberNames: ["りさ", "  りさ  "],
  });

  assert.deepEqual(errors.memberNames, [
    "同じ名前のメンバーは登録できません。",
    "同じ名前のメンバーは登録できません。",
  ]);
});

test("入力済みのメンバーが1人だけならエラーにする", () => {
  const result = createTrip({
    name: "京都旅行",
    memberNames: ["りさ"],
  });

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.errors.memberCount, "メンバーを2人以上入力してください。");
  }
});

test("新しい旅行を一覧の先頭に追加し、元のデータは変更しない", () => {
  const appData = { version: 1, trips: [firstTrip] };

  const result = addTrip(appData, secondTrip);

  assert.deepEqual(result.trips, [secondTrip, firstTrip]);
  assert.deepEqual(appData.trips, [firstTrip]);
});

test("指定した旅行だけを削除する", () => {
  const appData = { version: 1, trips: [firstTrip, secondTrip] };

  const result = removeTrip(appData, firstTrip.id);

  assert.deepEqual(result.trips, [secondTrip]);
});

test("すべての旅行を削除する", () => {
  const appData = { version: 1, trips: [firstTrip, secondTrip] };

  const result = removeAllTrips(appData);

  assert.deepEqual(result, { version: 1, trips: [] });
});

test("旅行IDに一致する旅行だけを取得する", () => {
  const appData = { version: 1, trips: [firstTrip, secondTrip] };

  assert.equal(findTripById(appData, secondTrip.id), secondTrip);
  assert.equal(findTripById(appData, "unknown-trip"), null);
});

test("名前の前後の空白を取り除き、旅行の末尾へメンバーを追加する", () => {
  const trip = {
    id: "trip-with-payment",
    name: "京都旅行",
    members: [
      { id: "member-1", name: "りさ" },
      { id: "member-2", name: "さき" },
    ],
    payments: [
      {
        id: "payment-1",
        payerId: "member-1",
        amountMinor: 1200,
        currency: "JPY",
        description: "昼食代",
        splitAmongMemberIds: ["member-1", "member-2"],
      },
    ],
  };
  const appData = { version: 1, trips: [trip] };

  const result = addMemberToTrip(
    appData,
    trip.id,
    "  あき  ",
    () => "member-3",
  );

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.deepEqual(result.member, { id: "member-3", name: "あき" });
    assert.deepEqual(result.trip.members, [
      ...trip.members,
      { id: "member-3", name: "あき" },
    ]);
    assert.equal(result.trip.payments, trip.payments);
    assert.equal(appData.trips[0].members.length, 2);
  }
});

test("空白だけのメンバー名は追加しない", () => {
  const appData = {
    version: 1,
    trips: [
      {
        id: "trip-1",
        name: "京都旅行",
        members: [
          { id: "member-1", name: "りさ" },
          { id: "member-2", name: "さき" },
        ],
        payments: [],
      },
    ],
  };

  const result = addMemberToTrip(appData, "trip-1", "   ");

  assert.deepEqual(result, {
    ok: false,
    error: "メンバー名を入力してください。",
  });
});

test("前後の空白を除くと既存名と同じになるメンバーは追加しない", () => {
  const appData = {
    version: 1,
    trips: [
      {
        id: "trip-1",
        name: "京都旅行",
        members: [
          { id: "member-1", name: "りさ" },
          { id: "member-2", name: "さき" },
        ],
        payments: [],
      },
    ],
  };

  const result = addMemberToTrip(appData, "trip-1", "  さき  ");

  assert.deepEqual(result, {
    ok: false,
    error: "同じ名前のメンバーは登録できません。",
  });
});

test("存在しない旅行にはメンバーを追加しない", () => {
  const result = addMemberToTrip(
    { version: 1, trips: [] },
    "unknown-trip",
    "りさ",
  );

  assert.deepEqual(result, { ok: false, error: "旅行が見つかりません。" });
});

test("支払いに含まれないメンバーだけを削除し、元の旅行は変更しない", () => {
  const members = [
    { id: "member-1", name: "りさ" },
    { id: "member-2", name: "さき" },
    { id: "member-3", name: "あき" },
  ];
  const payment = {
    id: "payment-1",
    payerId: "member-1",
    amountMinor: 1200,
    currency: "JPY",
    description: "昼食代",
    splitAmongMemberIds: ["member-1", "member-2"],
  };
  const trip = {
    id: "trip-1",
    name: "京都旅行",
    members,
    payments: [payment],
  };
  const appData = { version: 1, trips: [trip] };

  const result = removeMemberFromTrip(appData, trip.id, "member-3");

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.deepEqual(result.trip.members, members.slice(0, 2));
    assert.equal(result.trip.payments, trip.payments);
    assert.equal(appData.trips[0].members.length, 3);
  }
});

test("メンバーが2人しかいない旅行では削除しない", () => {
  const trip = {
    id: "trip-1",
    name: "京都旅行",
    members: [
      { id: "member-1", name: "りさ" },
      { id: "member-2", name: "さき" },
    ],
    payments: [],
  };
  const appData = { version: 1, trips: [trip] };

  const result = removeMemberFromTrip(appData, trip.id, "member-1");

  assert.deepEqual(result, {
    ok: false,
    error:
      "旅行には2人以上のメンバーが必要です。別のメンバーを追加してから削除してください。",
  });
});

test("支払った人として使われているメンバーは削除しない", () => {
  const trip = {
    id: "trip-1",
    name: "京都旅行",
    members: [
      { id: "member-1", name: "りさ" },
      { id: "member-2", name: "さき" },
      { id: "member-3", name: "あき" },
    ],
    payments: [
      {
        id: "payment-1",
        payerId: "member-3",
        amountMinor: 1200,
        currency: "JPY",
        description: "昼食代",
        splitAmongMemberIds: ["member-1", "member-2"],
      },
    ],
  };
  const appData = { version: 1, trips: [trip] };

  const result = removeMemberFromTrip(appData, trip.id, "member-3");

  assert.deepEqual(result, {
    ok: false,
    error:
      "このメンバーを含む支払いがあります。該当する支払いを先に削除してください。",
  });
});

test("費用の負担者として使われているメンバーは削除しない", () => {
  const trip = {
    id: "trip-1",
    name: "京都旅行",
    members: [
      { id: "member-1", name: "りさ" },
      { id: "member-2", name: "さき" },
      { id: "member-3", name: "あき" },
    ],
    payments: [
      {
        id: "payment-1",
        payerId: "member-1",
        amountMinor: 1200,
        currency: "JPY",
        description: "昼食代",
        splitAmongMemberIds: ["member-1", "member-3"],
      },
    ],
  };
  const appData = { version: 1, trips: [trip] };

  const result = removeMemberFromTrip(appData, trip.id, "member-3");

  assert.deepEqual(result, {
    ok: false,
    error:
      "このメンバーを含む支払いがあります。該当する支払いを先に削除してください。",
  });
});
