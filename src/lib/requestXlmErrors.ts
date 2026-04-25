export const REQUEST_XLM_ERROR_CODES = [
  "INVALID_JSON",
  "MISSING_PUBLIC_KEY",
  "INVALID_PUBLIC_KEY",
  "RATE_LIMITED",
  "FAUCET_CONFIGURATION_ERROR",
  "HORIZON_UNAVAILABLE",
  "TRANSACTION_REJECTED",
  "INTERNAL_ERROR",
  "REQUEST_UNAVAILABLE",
] as const;

export type RequestXlmErrorCode = (typeof REQUEST_XLM_ERROR_CODES)[number];

export const REQUEST_XLM_USER_MESSAGES: Record<RequestXlmErrorCode, string> = {
  INVALID_JSON: "The request format was invalid. Please refresh and try again.",
  MISSING_PUBLIC_KEY: "Please enter a Stellar public key before submitting.",
  INVALID_PUBLIC_KEY: "That does not look like a valid Stellar public key.",
  RATE_LIMITED: "This wallet already requested testnet XLM recently.",
  FAUCET_CONFIGURATION_ERROR:
    "The faucet is temporarily unavailable due to a configuration issue.",
  HORIZON_UNAVAILABLE: "The Stellar testnet service is temporarily unavailable.",
  TRANSACTION_REJECTED:
    "The request was received, but the network rejected the transaction.",
  INTERNAL_ERROR: "Something went wrong while processing your request.",
  REQUEST_UNAVAILABLE:
    "We could not reach the faucet service. Please try again shortly.",
};

export function isRequestXlmErrorCode(value: unknown): value is RequestXlmErrorCode {
  return (
    typeof value === "string" &&
    REQUEST_XLM_ERROR_CODES.includes(value as RequestXlmErrorCode)
  );
}
