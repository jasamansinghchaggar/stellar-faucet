type FreighterApiError = {
  code?: number;
  message?: string;
};

type FreighterResponse<T> = T & {
  error?: FreighterApiError;
};

export type WalletConnectErrorCode =
  | "WALLET_NOT_INSTALLED"
  | "WALLET_ACCESS_DENIED"
  | "WALLET_CONNECTION_FAILED";

const WALLET_CONNECT_USER_MESSAGES: Record<WalletConnectErrorCode, string> = {
  WALLET_NOT_INSTALLED:
    "Freighter wallet is not available. Install and enable the extension, then try again.",
  WALLET_ACCESS_DENIED:
    "Wallet connection was canceled. Approve the request in Freighter to continue.",
  WALLET_CONNECTION_FAILED:
    "Unable to connect to Freighter wallet right now. Please try again.",
};

export type WalletConnectResult =
  | {
      success: true;
      address: string;
    }
  | {
      success: false;
      code: WalletConnectErrorCode;
      message: string;
    };

function asFailure(code: WalletConnectErrorCode): WalletConnectResult {
  return {
    success: false,
    code,
    message: WALLET_CONNECT_USER_MESSAGES[code],
  };
}

function classifyFreighterError(error?: FreighterApiError): WalletConnectErrorCode {
  if (!error) {
    return "WALLET_CONNECTION_FAILED";
  }

  if (error.code === 4001) {
    return "WALLET_ACCESS_DENIED";
  }

  const normalizedMessage = error.message?.toLowerCase() ?? "";
  if (
    normalizedMessage.includes("reject") ||
    normalizedMessage.includes("decline") ||
    normalizedMessage.includes("deny") ||
    normalizedMessage.includes("cancel")
  ) {
    return "WALLET_ACCESS_DENIED";
  }

  if (
    normalizedMessage.includes("not connected") ||
    normalizedMessage.includes("not installed") ||
    normalizedMessage.includes("could not be found") ||
    normalizedMessage.includes("freighter")
  ) {
    return "WALLET_NOT_INSTALLED";
  }

  return "WALLET_CONNECTION_FAILED";
}

async function loadFreighterApi() {
  return import("@stellar/freighter-api");
}

export async function connectFreighterWallet(): Promise<WalletConnectResult> {
  if (typeof window === "undefined") {
    return asFailure("WALLET_CONNECTION_FAILED");
  }

  try {
    const { getAddress, isAllowed, isConnected, requestAccess } =
      await loadFreighterApi();

    const connection = (await isConnected()) as FreighterResponse<{
      isConnected: boolean;
    }>;
    if (connection.error || !connection.isConnected) {
      return asFailure("WALLET_NOT_INSTALLED");
    }

    const allowState = (await isAllowed()) as FreighterResponse<{
      isAllowed: boolean;
    }>;
    if (allowState.error) {
      return asFailure(classifyFreighterError(allowState.error));
    }

    const addressState = (allowState.isAllowed
      ? await getAddress()
      : await requestAccess()) as FreighterResponse<{ address: string }>;
    if (addressState.error || !addressState.address) {
      return asFailure(classifyFreighterError(addressState.error));
    }

    return {
      success: true,
      address: addressState.address,
    };
  } catch {
    return asFailure("WALLET_CONNECTION_FAILED");
  }
}

export async function getFreighterAddressIfAllowed(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const { getAddress, isAllowed, isConnected } = await loadFreighterApi();

    const connection = (await isConnected()) as FreighterResponse<{
      isConnected: boolean;
    }>;
    if (connection.error || !connection.isConnected) {
      return null;
    }

    const allowState = (await isAllowed()) as FreighterResponse<{
      isAllowed: boolean;
    }>;
    if (allowState.error || !allowState.isAllowed) {
      return null;
    }

    const addressState = (await getAddress()) as FreighterResponse<{
      address: string;
    }>;
    if (addressState.error || !addressState.address) {
      return null;
    }

    return addressState.address;
  } catch {
    return null;
  }
}
