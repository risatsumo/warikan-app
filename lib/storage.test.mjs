import assert from "node:assert/strict";
import test from "node:test";

import {
  APP_DATA_STORAGE_KEY,
  createEmptyAppData,
  loadAppData,
  saveAppData,
} from "./storage.ts";

const validAppData = {
  version: 4,
  trips: [
    {
      id: "trip-1",
      name: "京都旅行",
      localCurrency: "JPY",
      settlementCurrency: "JPY",
      exchangeRates: [],
      prioritizePayersForRounding: false,
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
    createMemoryStorage(JSON.stringify({ version: 5, trips: [] })),
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

test("バージョン1の日本円データをバージョン3へ移行する", () => {
  const legacyData = {
    version: 1,
    trips: [
      {
        id: "legacy-trip",
        name: "旧旅行",
        members: [
          { id: "member-1", name: "りさ" },
          { id: "member-2", name: "さき" },
        ],
        payments: [
          {
            id: "legacy-payment",
            payerId: "member-1",
            amountMinor: 1200,
            currency: "JPY",
            description: "昼食代",
            splitAmongMemberIds: ["member-1", "member-2"],
          },
        ],
      },
    ],
  };
  const result = loadAppData(
    createMemoryStorage(JSON.stringify(legacyData)),
  );

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.data.version, 4);
    assert.deepEqual(result.data.trips[0], {
      ...legacyData.trips[0],
      localCurrency: "JPY",
      settlementCurrency: "JPY",
      exchangeRates: [],
      prioritizePayersForRounding: false,
    });
  }
});

test("旅行と一致しない精算通貨や不正な為替レートは読み込まない", () => {
  const invalidCurrencyData = structuredClone(validAppData);
  invalidCurrencyData.trips[0].settlementCurrency = "USD";
  const invalidCurrencyResult = loadAppData(
    createMemoryStorage(JSON.stringify(invalidCurrencyData)),
  );

  assert.equal(invalidCurrencyResult.ok, false);

  const invalidRateData = structuredClone(validAppData);
  invalidRateData.trips[0].localCurrency = "USD";
  invalidRateData.trips[0].exchangeRates = [
    {
      currency: "USD",
      jpyPerCurrency: "0",
      source: "manual",
      rateDate: null,
      updatedAt: "2026-11-21T00:00:00.000Z",
    },
  ];
  const invalidRateResult = loadAppData(
    createMemoryStorage(JSON.stringify(invalidRateData)),
  );

  assert.equal(invalidRateResult.ok, false);
});

test("バージョン2の単一為替レートをバージョン3の通貨別レートへ移行する", () => {
  const version2Data = {
    version: 2,
    trips: [
      {
        id: "trip-usd",
        name: "ニューヨーク旅行",
        localCurrency: "USD",
        settlementCurrency: "USD",
        exchangeRate: {
          jpyPerLocalCurrency: "150.25",
          source: "manual",
          rateDate: null,
          updatedAt: "2026-11-21T00:00:00.000Z",
        },
        members: [
          { id: "member-1", name: "りさ" },
          { id: "member-2", name: "さき" },
        ],
        payments: [
          {
            id: "payment-usd",
            payerId: "member-1",
            amountMinor: 10000,
            currency: "USD",
            description: "ホテル代",
            splitAmongMemberIds: ["member-1", "member-2"],
          },
        ],
      },
    ],
  };
  const result = loadAppData(
    createMemoryStorage(JSON.stringify(version2Data)),
  );

  assert.equal(result.ok, true);

  if (result.ok) {
    assert.equal(result.data.version, 4);
    assert.deepEqual(result.data.trips[0].exchangeRates, [
      {
        currency: "USD",
        jpyPerCurrency: "150.25",
        source: "manual",
        rateDate: null,
        updatedAt: "2026-11-21T00:00:00.000Z",
      },
    ]);
  }
});

test("現在の現地通貨と異なる過去の支払い通貨を保持できる", () => {
  const multiCurrencyData = structuredClone(validAppData);
  multiCurrencyData.trips[0].localCurrency = "EUR";
  multiCurrencyData.trips[0].payments[0].currency = "USD";
  const storage = createMemoryStorage();

  assert.deepEqual(saveAppData(storage, multiCurrencyData), { ok: true });
  assert.deepEqual(loadAppData(storage), {
    ok: true,
    data: multiCurrencyData,
  });
});
