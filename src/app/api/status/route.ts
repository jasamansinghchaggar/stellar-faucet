import { NextResponse } from "next/server";

import { getFaucetBalance } from "@/lib/stellar";

export const runtime = "nodejs";

function getFaucetAmount() {
  const amount = process.env.FAUCET_AMOUNT_XLM ?? "100";
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("FAUCET_AMOUNT_XLM is invalid");
  }

  return amount;
}

export async function GET() {
  const amount = getFaucetAmount();

  try {
    const balance = await getFaucetBalance();
    return NextResponse.json(
      {
        operational: true,
        balance,
        amount,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      {
        operational: false,
        balance: null,
        amount,
        error: message,
      },
      { status: 200 },
    );
  }
}
