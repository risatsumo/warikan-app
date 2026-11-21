import assert from "node:assert/strict";
import test from "node:test";

import {
  createExchangeRate,
  exchangeRateToFraction,
  normalizePositiveExchangeRate,
  parseFrankfurterRateResponse,
} from "./exchange-rates.ts";

test("為替レートを正規化し、正確な分数へ変換する", () => {
  assert.equal(normalizePositiveExchangeRate(" 0150.2500 "), "150.25");
  assert.equal(normalizePositiveExchangeRate("0"), null);
  assert.equal(normalizePositiveExchangeRate("1e2"), null);
  assert.deepEqual(exchangeRateToFraction("150.25"), {
    numerator: 601n,
    denominator: 4n,
  });
});

test("保存する為替レートの日付と値を検証する", () => {
  assert.deepEqual(
    createExchangeRate({
      currency: "USD",
      jpyPerCurrency: "150.2500",
      source: "manual",
      rateDate: null,
      updatedAt: "2026-11-21T00:00:00.000Z",
    }),
    {
      currency: "USD",
      jpyPerCurrency: "150.25",
      source: "manual",
      rateDate: null,
      updatedAt: "2026-11-21T00:00:00.000Z",
    },
  );
  assert.equal(
    createExchangeRate({
      currency: "USD",
      jpyPerCurrency: "0",
      source: "manual",
      rateDate: null,
      updatedAt: "invalid",
    }),
    null,
  );
});

test("Frankfurterの応答が指定通貨と日本円の組み合わせか検証する", () => {
  assert.deepEqual(
    parseFrankfurterRateResponse(
      { base: "USD", quote: "JPY", rate: 150.25, date: "2026-11-20" },
      "USD",
    ),
    {
      localCurrency: "USD",
      jpyPerCurrency: "150.25",
      rateDate: "2026-11-20",
    },
  );
  assert.equal(
    parseFrankfurterRateResponse(
      { base: "EUR", quote: "JPY", rate: 150.25, date: "2026-11-20" },
      "USD",
    ),
    null,
  );
});
