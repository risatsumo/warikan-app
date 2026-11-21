import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMoney,
  getCurrencyFractionDigits,
  parseMoneyInput,
} from "./currencies.ts";

test("通貨ごとの最小単位で入力金額を整数へ変換する", () => {
  assert.equal(parseMoneyInput("1500", "JPY"), 1500);
  assert.equal(parseMoneyInput("12.5", "USD"), 1250);
  assert.equal(parseMoneyInput("12.50", "EUR"), 1250);
  assert.equal(parseMoneyInput("1.001", "USD"), null);
  assert.equal(parseMoneyInput("1.5", "KRW"), null);
  assert.equal(parseMoneyInput("0", "JPY"), null);
  assert.equal(parseMoneyInput("0.00", "USD"), null);
});

test("対応通貨の小数桁と表示を一致させる", () => {
  assert.equal(getCurrencyFractionDigits("JPY"), 0);
  assert.equal(getCurrencyFractionDigits("KRW"), 0);
  assert.equal(getCurrencyFractionDigits("USD"), 2);
  assert.match(formatMoney(1234n, "JPY"), /1,234/);
  assert.match(formatMoney(1234n, "USD"), /12\.34/);
});
