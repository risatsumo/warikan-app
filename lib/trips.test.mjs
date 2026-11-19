import assert from "node:assert/strict";
import test from "node:test";

import {
  addTrip,
  createTrip,
  removeAllTrips,
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
