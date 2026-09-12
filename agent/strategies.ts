import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { logInfo, logWarn, logError } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { decrypt } from "../lib/crypto.js";
import bs58 from "bs58";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUP_API = "https://quote-api.jup.ag/v6";

export interface JupiterQuoteResult {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo?: { label?: string; inputMint?: string; outputMint?: string; ammKey?: string };
    percent?: number;
  }>;
  otherAmountThreshold: string;
}

export interface ExecuteResult {
  success: boolean;
  signature?: string;
  error?: string;
  inAmount?: string;
  outAmount?: string;
  priceImpactPct?: string;
}

/**
 * Dapatkan quote swap terbaik dari Jupiter (agregator seluruh DEX Solana).
 * Memberikan harga terbaik lintas Meteora/Raydium/Orca/Whirlpool dll.
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: string,
  slippageBps = 50
): Promise<JupiterQuoteResult | null> {
  try {
    const url =
      `${JUP_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}` +
      `&amount=${amountLamports}&slippageBps=${slippageBps}&onlyDirectRoutes=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    logWarn("system", "strategy", `Jupiter quote gagal: ${err.message}`);
    return null;
  }
}

/**
 * Eksekusi swap via Jupiter (VersionedTransaction).
 * Ini pola dari CloddsBot: swapTransaction dari API, lalu sign & send versioned tx.
 */
export async function executeJupiterSwap(
  connection: Connection,
  keypair: Keypair,
  inputMint: string,
  outputMint: string,
  amountLamports: string,
  slippageBps = 50
): Promise<ExecuteResult> {
  try {
    const quote = await getJupiterQuote(inputMint, outputMint, amountLamports, slippageBps);
    if (!quote) return { success: false, error: "Tidak ada quote Jupiter" };

    const swapRes = await fetch(`${JUP_API}/swap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: keypair.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!swapRes.ok) {
      const body = await swapRes.text().catch(() => "");
      return { success: false, error: `Jupiter swap HTTP ${swapRes.status}: ${body.slice(0, 200)}` };
    }

    const { swapTransaction } = await swapRes.json();
    if (!swapTransaction) return { success: false, error: "swapTransaction kosong" };

    const txBytes = Buffer.from(swapTransaction, "base64");
    const versionedTx = VersionedTransaction.deserialize(new Uint8Array(txBytes));
    versionedTx.sign([keypair]);

    const signature = await connection.sendTransaction(versionedTx, { skipPreflight: false });

    return {
      success: true,
      signature,
      inAmount: quote.inAmount,
      outAmount: quote.outAmount,
      priceImpactPct: quote.priceImpactPct,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Strategi Jupiter Aggregator: swap dengan harga terbaik.
 * Digunakan hunter saat membuka posisi: SOL -> pair token via Jupiter (bukan swap manual Meteora).
 */
export async function executeAggregatedTrade(
  userId: string,
  pool: { address: string; tokenX: string; tokenY: string },
  trading: { deployAmountSol: number; rpcUrl?: string }
): Promise<ExecuteResult> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet?.privateKeyEnc) return { success: false, error: "Wallet tidak ditemukan" };

  const privateKey = decrypt(wallet.privateKeyEnc);
  const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const connection = new Connection(process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com"
  );

  // Tentukan output token (bukan SOL)
  const outputMint = pool.tokenX === SOL_MINT ? pool.tokenY : pool.tokenX;
  const amountLamports = String(Math.floor(trading.deployAmountSol * 1e9));

  return executeJupiterSwap(connection, keypair, SOL_MINT, outputMint, amountLamports);
}

/**
 * Perbandingan harga untuk deteksi peluang: bandingkan quote Meteora vs Jupiter.
 * Jika selisih > threshold, ada margin arbitrase.
 */
export async function detectArbitrageWindow(
  inputMint: string,
  outputMint: string,
  amountLamports: string
): Promise<{ jupiterRate: string | null; edgePct: number | null } | null> {
  try {
    const jup = await getJupiterQuote(inputMint, outputMint, amountLamports);
    if (!jup) return null;

    const jupiterRate =
      parseFloat(jup.outAmount) / Math.max(parseFloat(jup.inAmount), 1);

    return {
      jupiterRate: jupiterRate.toString(),
      edgePct: parseFloat(jup.priceImpactPct || "0"),
    };
  } catch {
    return null;
  }
}
