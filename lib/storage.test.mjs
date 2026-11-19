import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_DATA_STORAGE_KEY,
  createEmptyAppData,
  loadAppData,
  saveAppData,
} from "./storage.ts";

const validAppData = {
  version: 1,
  trips: [
    {
      id: "trip-1",
      name: "京都旅行",
      members: [
        { id: "member-1", name: "りさ" },
        { id: "member-2", name: "さき" },
      ],
      payments: [
        {
          id: "payment-1",
          payerId: "member-1",
          amountMinor: 10000,
          currency: "JPY",
          description: "宿泊費",
          splitAmongMemberIds: ["member-1", "member-2"],
        },
      ],
    },
  ],
};

function createMemoryStorage(initialValue = null) {
  const values = new Map();

  if (initialValue !== null) {
    values.set(APP_DATA_STORAGE_KEY, initialValue);
  }

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("保存データがなければ空のアプリデータを返す", () => {
  const result = loadAppData(createMemoryStorage());

  assert.deepEqual(result, { ok: true, data: createEmptyAppData() });
});

test("正しいデータを保存して再び読み込める", () => {
  const storage = createMemoryStorage();

  assert.deepEqual(saveAppData(storage, validAppData), { ok: true });
  assert.deepEqual(loadAppData(storage), { ok: true, data: validAppData });
});

test("壊れたJSONは空データと読み込みエラーを返す", () => {
  const result = loadAppData(createMemoryStorage("{invalid json"));

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.error.code, "invalid-data");
    assert.deepEqual(result.data, createEmptyAppData());
  }
});

test("未対応のデータバージョンは読み込まない", () => {
  const result = loadAppData(
    createMemoryStorage(JSON.stringify({ version: 2, trips: [] })),
  );

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.error.code, "invalid-data");
  }
});

test("存在しないメンバーを参照する支払いは読み込まない", () => {
  const invalidData = structuredClone(validAppData);
  invalidData.trips[0].payments[0].payerId = "missing-member";
  const result = loadAppData(
    createMemoryStorage(JSON.stringify(invalidData)),
  );

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.error.code, "invalid-data");
  }
});

test("localStorageの読み込み失敗をエラーとして返す", () => {
  const result = loadAppData({
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {},
  });

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.error.code, "load-failed");
  }
});

test("localStorageの保存失敗をエラーとして返す", () => {
  const result = saveAppData(
    {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("storage full");
      },
    },
    validAppData,
  );

  assert.equal(result.ok, false);

  if (!result.ok) {
    assert.equal(result.error.code, "save-failed");
  }
});
