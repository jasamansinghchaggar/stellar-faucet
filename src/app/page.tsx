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
};

async function fetchStatus(): Promise<FaucetStatus> {
  const response = await fetch("/api/status", { cache: "no-store" });
  return (await response.json()) as FaucetStatus;
}

export default function Home() {
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [result, setResult] = useState<RequestResult | null>(null);
  const [status, setStatus] = useState<FaucetStatus | null>(null);

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
        nextAvailableAt?: string | null;
      };

      if (!response.ok || !data.success) {
        const retryText = data.nextAvailableAt
          ? ` Next eligible request: ${new Date(data.nextAvailableAt).toLocaleString()}.`
          : "";
        setResult({
          type: "error",
          message: `${data.error ?? "Request failed."}${retryText}`,
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
      setResult({
        type: "error",
        message: "Unable to send request. Please try again.",
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
                  Paste a Stellar public key (56 chars, starts with G).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-3">
                  <Textarea
                    value={publicKey}
                    onChange={(event) => setPublicKey(event.target.value)}
                    placeholder="G..."
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
                    disabled={loading || !publicKey.trim()}
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
                  <Alert>
                    <TriangleAlert className="size-4" />
                    <AlertTitle>No request yet</AlertTitle>
                    <AlertDescription>
                      Submit a valid Stellar public key to receive testnet XLM.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant={result.type === "success" ? "default" : "destructive"}>
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
                      <div className="mt-2 rounded-md border border-border bg-background p-2 font-mono text-xs break-all">
                        {result.hash}
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
