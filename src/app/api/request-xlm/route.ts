import { NextResponse } from "next/server";

import { getRateLimitInfo, isRateLimited } from "@/lib/rateLimit";
import { isValidPublicKey, sendXLM } from "@/lib/stellar";

export const runtime = "nodejs";

type RequestPayload = {
  publicKey?: unknown;
};

function getRateLimitHours() {
  const configuredRateLimit = process.env.RATE_LIMIT_HOURS ?? "24";
  const parsedRateLimit = Number(configuredRateLimit);

  if (!Number.isFinite(parsedRateLimit) || parsedRateLimit <= 0) {
    throw new Error("RATE_LIMIT_HOURS is invalid");
  }

  return parsedRateLimit;
}

function getFaucetAmount() {
  const amount = process.env.FAUCET_AMOUNT_XLM ?? "100";
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("FAUCET_AMOUNT_XLM is invalid");
  }

  return amount;
}

export async function POST(request: Request) {
  let payload: RequestPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const publicKey =
    typeof payload.publicKey === "string" ? payload.publicKey.trim() : "";

  if (!publicKey) {
    return NextResponse.json(
      { error: "publicKey is required in the request body" },
      { status: 400 },
    );
  }

  if (!isValidPublicKey(publicKey)) {
    return NextResponse.json(
      {
        error:
          "Invalid Stellar public key. It must be 56 characters and start with G.",
      },
      { status: 400 },
    );
  }

  try {
    const rateLimitHours = getRateLimitHours();
    const limited = await isRateLimited(publicKey, rateLimitHours);

    if (limited) {
      const info = await getRateLimitInfo(publicKey, rateLimitHours);
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          nextAvailableAt: info.nextAvailableAt?.toISOString() ?? null,
          retryAfterSeconds: Math.ceil(info.retryAfterMs / 1000),
        },
        { status: 429 },
      );
    }

    const amount = getFaucetAmount();
    const result = await sendXLM(publicKey, amount);

    return NextResponse.json(
      {
        success: true,
        hash: result.hash,
        amount,
        destination: publicKey,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
