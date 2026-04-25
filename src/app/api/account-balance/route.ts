import { NextResponse } from "next/server";

import { getAccountBalance, isValidPublicKey } from "@/lib/stellar";

export const runtime = "nodejs";

function buildErrorResponse(status: number, error: string) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status },
  );
}

function classifyBalanceError(error: unknown): {
  status: number;
  message: string;
} {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const responseStatus =
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
      ? error.response.status
      : null;

  if (responseStatus === 404 || message.includes("resource missing")) {
    return {
      status: 404,
      message: "This account was not found on Stellar testnet.",
    };
  }

  if (
    message.includes("horizon") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("timeout") ||
    message.includes("econn")
  ) {
    return {
      status: 503,
      message: "Unable to reach Stellar testnet right now.",
    };
  }

  return {
    status: 500,
    message: "Unable to fetch account balance right now.",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicKey = searchParams.get("publicKey")?.trim() ?? "";

  if (!publicKey) {
    return buildErrorResponse(400, "Missing public key.");
  }

  if (!isValidPublicKey(publicKey)) {
    return buildErrorResponse(400, "Invalid Stellar public key.");
  }

  try {
    const balance = await getAccountBalance(publicKey);
    return NextResponse.json(
      {
        success: true,
        publicKey,
        balance,
      },
      { status: 200 },
    );
  } catch (error) {
    const { status, message } = classifyBalanceError(error);
    return buildErrorResponse(status, message);
  }
}
