"use client";

import { type SubmitEvent, useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Droplets,
  Loader2,
  SendHorizontal,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  connectFreighterWallet,
  getFreighterAddressIfAllowed,
} from "@/lib/freighter";
import {
  REQUEST_XLM_USER_MESSAGES,
  isRequestXlmErrorCode,
  type RequestXlmErrorCode,
} from "@/lib/requestXlmErrors";

type FaucetStatus = {
  operational: boolean;
  balance: string | null;
  amount: string;
  error?: string;
};

type RequestResult = {
  type: "success" | "error";
  message: string;
  hash?: string;
  code?: RequestXlmErrorCode;
};

async function fetchStatus(): Promise<FaucetStatus> {
  const response = await fetch("/api/status", { cache: "no-store" });
  return (await response.json()) as FaucetStatus;
}

function getFallbackRequestErrorCode(status: number): RequestXlmErrorCode {
  if (status === 429) {
    return "RATE_LIMITED";
  }

  if (status === 422) {
    return "TRANSACTION_REJECTED";
  }

  if (status === 503) {
    return "HORIZON_UNAVAILABLE";
  }

  if (status === 400) {
    return "INVALID_JSON";
  }

  return "INTERNAL_ERROR";
}

function getUserFacingRequestMessage(
  code: RequestXlmErrorCode,
  nextAvailableAt?: string | null,
) {
  if (code === "RATE_LIMITED" && nextAvailableAt) {
    return `${REQUEST_XLM_USER_MESSAGES[code]} Try again after ${new Date(
      nextAvailableAt,
    ).toLocaleString()}.`;
  }

  return REQUEST_XLM_USER_MESSAGES[code];
}

export default function Home() {
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [status, setStatus] = useState<FaucetStatus | null>(null);
  const walletConnected = Boolean(publicKey.trim());

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const statusResponse = await fetchStatus();
        if (active) {
          setStatus(statusResponse);
        }
      } catch {
        if (active) {
          setStatus({
            operational: false,
            balance: null,
            amount: "100",
            error: "Unable to fetch faucet status.",
          });
        }
      } finally {
        if (active) {
          setStatusLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const walletAddress = await getFreighterAddressIfAllowed();
      if (active && walletAddress) {
        setPublicKey(walletAddress);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function onConnectWallet() {
    setWalletLoading(true);
    setWalletError(null);

    const walletResult = await connectFreighterWallet();
    if (!walletResult.success) {
      setWalletError(walletResult.message);
      setWalletLoading(false);
      return;
    }

    setPublicKey(walletResult.address);
    setWalletLoading(false);
  }

  function onDisconnectWallet() {
    setPublicKey("");
    setWalletError(null);
  }

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/request-xlm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicKey: publicKey.trim() }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        hash?: string;
        amount?: string;
        error?: string;
        errorCode?: string;
        nextAvailableAt?: string | null;
      };

      if (!response.ok || !data.success) {
        const errorCode = isRequestXlmErrorCode(data.errorCode)
          ? data.errorCode
          : getFallbackRequestErrorCode(response.status);
        setResult({
          type: "error",
          code: errorCode,
          message: getUserFacingRequestMessage(errorCode, data.nextAvailableAt),
        });
        return;
      }

      setResult({
        type: "success",
        message: `Successfully sent ${data.amount ?? "configured"} XLM.`,
        hash: data.hash,
      });

      const statusResponse = await fetchStatus();
      setStatus(statusResponse);
    } catch {
      const errorCode: RequestXlmErrorCode = "REQUEST_UNAVAILABLE";
      setResult({
        type: "error",
        code: errorCode,
        message: REQUEST_XLM_USER_MESSAGES[errorCode],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full border-border bg-card shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <Badge variant="outline" className="w-fit">
                  Stellar Testnet
                </Badge>
                <CardTitle className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                  Faucet
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Request test XLM in one click for development and integration testing.
                </CardDescription>
              </div>
              <Badge
                variant={status?.operational ? "default" : "destructive"}
                className="h-6 px-2.5"
              >
                {status?.operational ? "Operational" : "Unavailable"}
              </Badge>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="space-y-4">
            <Card size="sm" className="border-border bg-muted/40 shadow-none">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4" />
                  Faucet status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Current status</p>
                  <p className="mt-1 text-sm font-medium">
                    {statusLoading ? "Loading..." : status?.operational ? "Operational" : "Unavailable"}
                  </p>
                  {status?.error ? (
                    <p className="mt-2 text-xs text-muted-foreground">{status.error}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card size="sm" className="border-border bg-muted/40 shadow-none">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2 text-sm font-medium">
                  <Droplets className="size-4" />
                  Request XLM
                </CardTitle>
                <CardDescription>
                  Connect Freighter to auto-fill your Stellar public key.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onConnectWallet}
                      disabled={walletLoading || loading}
                    >
                      {walletLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Connecting wallet...
                        </>
                      ) : (
                        <>
                          <Wallet className="size-4" />
                          {walletConnected ? "Reconnect Freighter" : "Connect Freighter"}
                        </>
                      )}
                    </Button>
                    {walletConnected ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={onDisconnectWallet}
                        disabled={walletLoading || loading}
                      >
                        Disconnect
                      </Button>
                    ) : null}
                  </div>
                  {walletError ? (
                    <p className="text-xs text-destructive">{walletError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {walletConnected
                        ? "Wallet connected. Your public key was imported from Freighter."
                        : "Connect your Freighter wallet to load your public key."}
                    </p>
                  )}
                  <Textarea
                    value={publicKey}
                    readOnly
                    placeholder="Connect Freighter wallet to load your public key."
                    className="min-h-28 bg-background font-mono text-xs sm:text-sm"
                    required
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{publicKey.trim().length}/56</span>
                    <span>Stellar public key</span>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={loading || walletLoading || !publicKey.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Sending request...
                      </>
                    ) : (
                      <>
                        <SendHorizontal className="size-4" />
                        Request test XLM
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card size="sm" className="border-border bg-muted/40 shadow-none">
              <CardHeader>
                <CardTitle className="font-heading text-sm font-medium">Result</CardTitle>
              </CardHeader>
              <CardContent>
                {!result ? (
                  <Alert variant="warning">
                    <TriangleAlert className="size-4" />
                    <AlertTitle>No request yet</AlertTitle>
                    <AlertDescription>
                      Submit a valid Stellar public key to receive testnet XLM.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert
                    variant={
                      result.type === "success"
                        ? "success"
                        : result.code === "RATE_LIMITED"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {result.type === "success" ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <TriangleAlert className="size-4" />
                    )}
                    <AlertTitle>
                      {result.type === "success" ? "Request successful" : "Request failed"}
                    </AlertTitle>
                    <AlertDescription>{result.message}</AlertDescription>
                    {result.hash ? (
                      <div className="mt-2 space-y-2 group-has-[>svg]/alert:col-start-2">
                        <div
                          className={`rounded-md border p-2 font-mono text-xs break-all ${
                            result.type === "success"
                              ? "border-emerald-300/60 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-100"
                              : "border-red-300/60 bg-red-50/70 text-red-900 dark:border-red-800/70 dark:bg-red-950/40 dark:text-red-100"
                          }`}
                        >
                          {result.hash}
                        </div>
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${encodeURIComponent(result.hash)}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4 ${
                            result.type === "success"
                              ? "text-emerald-800 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
                              : "text-red-800 hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                          }`}
                        >
                          View transaction on Stellar Expert
                          <ArrowUpRight className="size-3" />
                        </a>
                      </div>
                    ) : null}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </CardContent>

          <CardFooter className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              Built for fast Stellar testnet development.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                render={
                  <a
                    href="https://developers.stellar.org/docs"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
                className="h-6 gap-1"
              >
                Docs <ArrowUpRight className="size-3" />
              </Badge>
              <Badge
                variant="outline"
                render={
                  <a
                    href="https://stellar.expert/explorer/testnet"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
                className="h-6 gap-1"
              >
                Explorer <ArrowUpRight className="size-3" />
              </Badge>
              <Badge
                variant="outline"
                render={
                  <a
                    href="https://horizon-testnet.stellar.org"
                    target="_blank"
                    rel="noreferrer"
                  />
                }
                className="h-6 gap-1"
              >
                Horizon <ArrowUpRight className="size-3" />
              </Badge>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
