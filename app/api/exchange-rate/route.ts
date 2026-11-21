import type { NextRequest } from "next/server";

import { isSupportedCurrencyCode } from "@/lib/currencies";
import { parseFrankfurterRateResponse } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const currency = request.nextUrl.searchParams.get("currency");

  if (!isSupportedCurrencyCode(currency) || currency === "JPY") {
    return Response.json(
      { error: "対応する現地通貨を指定してください。" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${currency.toLowerCase()}/jpy`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      return Response.json(
        { error: "為替APIからレートを取得できませんでした。" },
        { status: 502 },
      );
    }

    const parsedRate = parseFrankfurterRateResponse(
      await response.json(),
      currency,
    );

    if (parsedRate === null) {
      return Response.json(
        { error: "為替APIから受け取ったデータの形式が正しくありません。" },
        { status: 502 },
      );
    }

    return Response.json(
      {
        ...parsedRate,
        retrievedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "為替APIに接続できませんでした。手入力でも設定できます。" },
      { status: 502 },
    );
  }
}
