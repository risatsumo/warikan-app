export interface ReceiptLineCandidate {
  readonly description: string;
  readonly amount: string;
}

const ignoredLineWords = /小計|合計|お会計|お支払|税込|税抜|消費税|内税|外税|税率|値引|割引|クーポン|お預り|お預かり|お釣|釣銭|現金|クレジット|カード|電子マネー|ポイント|領収|電話|TEL|住所|登録番号|レシート|担当|日時|伝票|テーブル|客数|点数/i;

/** OCRの行から品目らしい「品名 金額」を候補として抽出する。候補は必ず画面で確認・修正する。 */
export function parseReceiptLines(text: string): readonly ReceiptLineCandidate[] {
  const candidates: ReceiptLineCandidate[] = [];
  const normalizedText = text.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));

  for (const rawLine of normalizedText.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (line.length < 3 || ignoredLineWords.test(line)) continue;

    const match = line.match(/^(.+?)(?:\s*[¥￥$]\s*|\s+)([\d,]+(?:\.\d{1,2})?)\s*$/);
    if (!match) continue;

    const description = match[1].replace(/^[\d.)\-\s]+/, "").trim();
    const amount = match[2].replace(/,/g, "");
    if (description.length === 0 || !/[\p{L}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(description)) continue;
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) continue;
    candidates.push({ description, amount });
  }

  return candidates;
}
