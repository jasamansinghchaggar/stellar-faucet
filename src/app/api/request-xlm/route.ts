import { NextResponse } from "next/server";

import {
  REQUEST_XLM_USER_MESSAGES,
  type RequestXlmErrorCode,
} from "@/lib/requestXlmErrors";
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

function buildErrorResponse(
  code: RequestXlmErrorCode,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return NextResponse.json(
    {
      success: false,
      errorCode: code,
      error: REQUEST_XLM_USER_MESSAGES[code],
      ...extra,
    },
    { status },
  );
}

function hasStellarResultCodes(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== "object") {
    return false;
  }

  const data = (response as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    return false;
  }

  const extras = (data as { extras?: unknown }).extras;
  if (!extras || typeof extras !== "object") {
    return false;
  }

  const resultCodes = (extras as { result_codes?: unknown }).result_codes;
  return Boolean(resultCodes && typeof resultCodes === "object");
}

function classifyServerError(error: unknown): {
  code: RequestXlmErrorCode;
  status: number;
} {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("faucet_secret_key") ||
    message.includes("rate_limit_hours") ||
    message.includes("faucet_amount_xlm")
  ) {
    return { code: "FAUCET_CONFIGURATION_ERROR", status: 500 };
  }

  if (
    message.includes("horizon") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("econn")
  ) {
    return { code: "HORIZON_UNAVAILABLE", status: 503 };
  }

  if (
    hasStellarResultCodes(error) ||
    message.includes("op_") ||
    message.includes("tx_") ||
    message.includes("destination") ||
    message.includes("sequence") ||
    message.includes("insufficient")
  ) {
    return { code: "TRANSACTION_REJECTED", status: 422 };
  }

  return { code: "INTERNAL_ERROR", status: 500 };
}

export async function POST(request: Request) {
  let payload: RequestPayload;

  try {
    payload = await request.json();
  } catch {
    return buildErrorResponse("INVALID_JSON", 400);
  }

  const publicKey =
    typeof payload.publicKey === "string" ? payload.publicKey.trim() : "";

  if (!publicKey) {
    return buildErrorResponse("MISSING_PUBLIC_KEY", 400);
  }

  if (!isValidPublicKey(publicKey)) {
    return buildErrorResponse("INVALID_PUBLIC_KEY", 400);
  }

  try {
    const rateLimitHours = getRateLimitHours();
    const limited = await isRateLimited(publicKey, rateLimitHours);

    if (limited) {
      const info = await getRateLimitInfo(publicKey, rateLimitHours);
      return buildErrorResponse("RATE_LIMITED", 429, {
        nextAvailableAt: info.nextAvailableAt?.toISOString() ?? null,
        retryAfterSeconds: Math.ceil(info.retryAfterMs / 1000),
      });
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
    const { code, status } = classifyServerError(error);
    return buildErrorResponse(code, status);
  }
}
