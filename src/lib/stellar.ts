import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
} from "stellar-sdk";

const horizonUrl =
  process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const networkPassphrase =
  process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;
const defaultFaucetAmount = process.env.FAUCET_AMOUNT_XLM ?? "100";

type SendXLMOptions = {
  submit?: boolean;
};

export type SendXLMResult = {
  submitted: boolean;
  hash: string;
  envelopeXdr: string;
};

function getHorizonServer() {
  return new Horizon.Server(horizonUrl);
}

function getFaucetKeypair() {
  const secretKey = process.env.FAUCET_SECRET_KEY;

  if (!secretKey) {
    throw new Error("FAUCET_SECRET_KEY not configured");
  }

  if (!StrKey.isValidEd25519SecretSeed(secretKey)) {
    throw new Error("FAUCET_SECRET_KEY is invalid");
  }

  return Keypair.fromSecret(secretKey);
}

function assertValidPublicKey(publicKey: string) {
  if (!StrKey.isValidEd25519PublicKey(publicKey)) {
    throw new Error("Invalid Stellar public key");
  }
}

function assertValidAmount(amount: string) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Amount must be a positive number");
  }
}

export async function getAccountBalance(publicKey: string): Promise<string> {
  assertValidPublicKey(publicKey);

  const server = getHorizonServer();
  const account = await server.loadAccount(publicKey);
  const nativeBalance = account.balances.find(
    (balance) => balance.asset_type === "native",
  );

  if (!nativeBalance || !("balance" in nativeBalance)) {
    throw new Error("Native XLM balance not found");
  }

  return nativeBalance.balance;
}

export async function getFaucetBalance(): Promise<string> {
  const faucetKeypair = getFaucetKeypair();
  return getAccountBalance(faucetKeypair.publicKey());
}

export function isValidPublicKey(publicKey: string): boolean {
  return StrKey.isValidEd25519PublicKey(publicKey);
}

export async function sendXLM(
  publicKey: string,
  amount = defaultFaucetAmount,
  options: SendXLMOptions = {},
): Promise<SendXLMResult> {
  assertValidPublicKey(publicKey);
  assertValidAmount(amount);

  const faucetKeypair = getFaucetKeypair();
  const server = getHorizonServer();
  const sourceAccount = await server.loadAccount(faucetKeypair.publicKey());

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination: publicKey,
        asset: Asset.native(),
        amount,
      }),
    )
    .setTimeout(30)
    .build();

  transaction.sign(faucetKeypair);

  if (options.submit === false) {
    return {
      submitted: false,
      hash: transaction.hash().toString("hex"),
      envelopeXdr: transaction.toXDR(),
    };
  }

  const response = await server.submitTransaction(transaction);
  return {
    submitted: true,
    hash: response.hash,
    envelopeXdr: transaction.toXDR(),
  };
}
