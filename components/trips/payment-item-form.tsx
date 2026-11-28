import { useState, type FormEvent } from "react";

import { createPayment, createUpdatedPayment, type PaymentValidationErrors } from "@/lib/payments";
import { formatMoney, formatMoneyInput, getCurrencyFractionDigits, getCurrencyInputStep, parseMoneyInput } from "@/lib/currencies";
import { parseReceiptLines } from "@/lib/receipt-lines";
import type { CurrencyCode, Member, Payment } from "@/types/domain";

interface ItemDraft {
  readonly description: string;
  readonly amount: string;
  readonly memberIds: readonly string[];
}

interface Props {
  readonly members: readonly Member[];
  readonly localCurrency: CurrencyCode;
  readonly paymentToEdit?: Payment;
  readonly onSavePayment: (payment: Payment) => string | null;
  readonly onCancelEdit?: () => void;
}

export function PaymentItemForm({ members, localCurrency, paymentToEdit, onSavePayment, onCancelEdit }: Props) {
  const editing = paymentToEdit !== undefined;
  const initialItems = paymentToEdit?.items ?? (paymentToEdit === undefined ? [] : [{ id: "legacy", description: paymentToEdit.description, amountMinor: paymentToEdit.amountMinor, splitAmongMemberIds: paymentToEdit.splitAmongMemberIds }]);
  const [payerId, setPayerId] = useState(paymentToEdit?.payerId ?? members[0]?.id ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(paymentToEdit?.currency ?? localCurrency);
  const [receiptName, setReceiptName] = useState(paymentToEdit?.description ?? "");
  const [items, setItems] = useState<readonly ItemDraft[]>(initialItems.length > 0 ? initialItems.map((item) => ({ description: item.description, amount: formatMoneyInput(item.amountMinor, paymentToEdit?.currency ?? localCurrency), memberIds: item.splitAmongMemberIds })) : [{ description: "", amount: "", memberIds: members.map((member) => member.id) }]);
  const [errors, setErrors] = useState<PaymentValidationErrors | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const currencies = Array.from(new Set<CurrencyCode>([paymentToEdit?.currency ?? localCurrency, localCurrency, "JPY"]));
  const formError = errors === null ? null : errors.description ?? errors.amount ?? errors.currency ?? errors.payerId ?? errors.splitAmongMemberIds;

  function updateItem(index: number, update: Partial<ItemDraft>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
    setErrors(null); setMessage(null);
  }

  function toggleMember(index: number, memberId: string, checked: boolean) {
    const current = items[index];
    if (!current) return;
    updateItem(index, { memberIds: checked ? [...current.memberIds, memberId] : current.memberIds.filter((id) => id !== memberId) });
  }

  async function readReceipt(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setOcrStatus("画像ファイルを選択してください。");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setOcrStatus("画像は12MB以下を選択してください。");
      return;
    }
    setOcrStatus("OCRを準備しています…");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("jpn", undefined, {
        logger: ({ status, progress }) => setOcrStatus(`${status}… ${Math.round(progress * 100)}%`),
      });
      try {
        setOcrStatus("レシートを読み取っています…");
        const result = await worker.recognize(file);
        const candidates = parseReceiptLines(result.data.text);
        if (candidates.length === 0) {
          setOcrStatus("品目を読み取れませんでした。明るい場所で撮影した画像を選ぶか、下の欄へ入力してください。");
          return;
        }
        setItems(candidates.map((candidate) => ({
          ...candidate,
          memberIds: members.map((member) => member.id),
        })));
        setErrors(null);
        setOcrStatus(`${candidates.length}件の候補を読み取りました。金額と負担する人を確認してください。`);
      } finally {
        await worker.terminate();
      }
    } catch {
      setOcrStatus("レシートを読み取れませんでした。インターネット接続を確認するか、下の欄へ入力してください。");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    const itemTotal = items.reduce((total, item) => total + (parseMoneyInput(item.amount, currency) ?? 0), 0);
    const allMemberIds = Array.from(new Set(items.flatMap((item) => item.memberIds)));
    const formInput = {
      payerId,
      currency,
      amount: formatMoneyInput(itemTotal, currency),
      description: receiptName.trim() || `レシート明細（${items.length}品目）`,
      splitAmongMemberIds: allMemberIds,
      items: items.map((item) => ({ description: item.description, amount: item.amount, splitAmongMemberIds: item.memberIds })),
    };
    const result = editing
      ? createUpdatedPayment(formInput, members, localCurrency, paymentToEdit)
      : createPayment(formInput, members, localCurrency);
    if (!result.ok) { setErrors(result.errors); return; }
    const saveError = onSavePayment(result.payment);
    if (saveError !== null) { setMessage(saveError); return; }
    if (editing) return;
    setReceiptName(""); setItems([{ description: "", amount: "", memberIds: members.map((member) => member.id) }]);
    setMessage(`「${result.payment.description}」を追加しました。`);
  }

  const inputClass = "mt-1 h-11 min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-100";

  return <form className={`rounded-2xl border p-4 sm:p-5 ${editing ? "border-sky-200 bg-white" : "mt-6 border-amber-100 bg-amber-50/60"}`} onSubmit={submit} noValidate>
    <h3 className="font-bold text-slate-900">{editing ? "支払いを編集" : "レシート明細を入力"}</h3>
    <p className="mt-1 text-sm leading-6 text-slate-600">品目ごとに金額と食べた人を選ぶと、それぞれの負担額を計算します。</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-sm font-semibold text-slate-800">立て替えた人<select className={`${inputClass} w-full`} value={payerId} onChange={(event) => setPayerId(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-800">支払い通貨<select className={`${inputClass} w-full`} value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>{currencies.map((code) => <option key={code}>{code}</option>)}</select></label>
      <label className="text-sm font-semibold text-slate-800">店名・メモ（任意）<input className={`${inputClass} w-full`} value={receiptName} onChange={(event) => setReceiptName(event.target.value)} placeholder="例：駅前食堂" /></label>
    </div>
    {formError && <p role="alert" className="mt-3 text-sm text-red-700">{formError}</p>}
    <div className="mt-5 space-y-3">
      <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-sky-200 bg-white px-4 text-sm font-bold text-sky-800 hover:bg-sky-50">
        🧾 レシート画像から読み取る
        <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { void readReceipt(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      </label>
      {ocrStatus && <p role="status" className="text-sm text-slate-600">{ocrStatus}</p>}
      {items.map((item, index) => <fieldset key={index} className="rounded-xl border border-slate-200 bg-white p-3">
        <legend className="px-1 text-sm font-bold text-slate-700">品目 {index + 1}</legend>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
          <label className="text-xs font-semibold text-slate-600">品目名<input className={`${inputClass} w-full`} value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="例：焼き魚定食" /></label>
          <label className="text-xs font-semibold text-slate-600">金額（{currency}）<input className={`${inputClass} w-full`} type="number" inputMode={getCurrencyFractionDigits(currency) === 0 ? "numeric" : "decimal"} min={getCurrencyInputStep(currency)} step={getCurrencyInputStep(currency)} value={item.amount} onChange={(event) => updateItem(index, { amount: event.target.value })} placeholder={currency === "JPY" || currency === "KRW" ? "1200" : "12.50"} /></label>
          {items.length > 1 && <button type="button" className="min-h-11 rounded-lg px-3 text-sm font-bold text-red-600 hover:bg-red-50" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>削除</button>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{members.map((member) => <label key={member.id} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 text-sm"><input type="checkbox" checked={item.memberIds.includes(member.id)} onChange={(event) => toggleMember(index, member.id, event.target.checked)} />{member.name}</label>)}</div>
      </fieldset>)}
      {errors?.items && <p role="alert" className="text-sm text-red-700">{errors.items}</p>}
      <button type="button" className="min-h-11 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-white" onClick={() => setItems((current) => [...current, { description: "", amount: "", memberIds: members.map((member) => member.id) }])}>＋ 品目を追加</button>
    </div>
    <p className="mt-3 text-right text-sm font-bold text-slate-800">合計：{formatMoney(BigInt(items.reduce((total, item) => total + (parseMoneyInput(item.amount, currency) ?? 0), 0)), currency)}</p>
    {message && <p role={editing ? "alert" : "status"} className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{editing && onCancelEdit && <button type="button" className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-bold" onClick={onCancelEdit}>キャンセル</button>}<button type="submit" className="min-h-12 rounded-xl bg-slate-950 px-5 font-bold text-white hover:bg-amber-700">{editing ? "変更を保存" : "支払いを追加"}</button></div>
  </form>;
}
