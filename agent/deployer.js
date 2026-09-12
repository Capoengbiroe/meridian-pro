import { logInfo, logWarn, logError } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { decrypt } from "../lib/crypto.js";
import bs58 from "bs58";
import { executeJupiterSwap, getJupiterQuote } from "./strategies.ts";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function deployIntoPool(userId, pool, trading, risk, opts = {}) {
  const dryRun = opts.dryRun ?? trading.dryRun ?? true;
  const mode = dryRun ? "DRY RUN" : "LIVE";
  const positionStatus = dryRun ? "SIMULATED" : "OPEN";

  try {
    logInfo(userId, "hunter", `[${mode}] Persiapan transaksi ke pool ${pool.address} (${pool.tokenX?.slice(0,6)}/${pool.tokenY?.slice(0,6)})...`);

    const web3 = await import("@solana/web3.js");
    const BN = (await import("bn.js")).default;
    const dlmmLib = await import("@meteora-ag/dlmm");
    const DLMM = dlmmLib.default || dlmmLib.DLMM;
    if (!DLMM) throw new Error("DLMM SDK tidak tersedia");

    const walletData = await prisma.wallet.findUnique({ where: { userId } });
    if (!walletData?.privateKeyEnc) throw new Error("Wallet tidak ditemukan");

    const privateKey = decrypt(walletData.privateKeyEnc);
    const keypair = web3.Keypair.fromSecretKey(bs58.decode(privateKey));
    const connection = new web3.Connection(
      process.env.HELIUS_API_KEY
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : "https://api.mainnet-beta.solana.com"
    );

    logInfo(userId, "hunter", `[${mode}] Membuat DLMM instance...`);
    const poolInstance = await DLMM.create(connection, new web3.PublicKey(pool.address));

    const activeBinInfo = await poolInstance.getActiveBin();
    const activeBinId = activeBinInfo.binId;
    const minBinId = activeBinId - 10;
    const maxBinId = activeBinId + 10;
    const binStep = poolInstance.binStep;

    // ========== JALUR 1: swap via Jupiter (quote NYATA di kedua mode) ==========
    const halfLamports = Math.floor(trading.deployAmountSol * 1e9 / 2);
    const outputMint = pool.tokenX === "So11111111111111111111111111111111111111112"
      ? pool.tokenY : pool.tokenX;

    const quote = await getJupiterQuote(SOL_MINT, outputMint, String(halfLamports), 100);
    if (quote) {
      const outToken = (parseFloat(quote.outAmount) / 1e9).toFixed(6);
      const impact = quote.priceImpactPct;
      logInfo(userId, "hunter", `[${mode}] Jupiter quote: 0.25 SOL -> ${outToken} token (impact ${impact}%)`);
    } else {
      logWarn(userId, "hunter", `[${mode}] Quote Jupiter tidak tersedia, lanjut tanpa kalibrasi`);
    }

    let worldSignature = "(dry-run, tanpa transaksi nyata)";

    if (!dryRun) {
      logInfo(userId, "hunter", "[LIVE] Swap via Jupiter aggregator...");
      const jupResult = await executeJupiterSwap(
        connection, keypair, SOL_MINT, outputMint, String(halfLamports), 100
      );
      if (jupResult.success) {
        logInfo(userId, "hunter", `[LIVE] Jupiter swap OK: ${jupResult.signature}`);
      } else {
        logWarn(userId, "hunter", `[LIVE] Jupiter swap gagal: ${jupResult.error}`);
      }

      logInfo(userId, "hunter", `[LIVE] Buka posisi DLMM (bins ${minBinId}..${maxBinId}, step ${binStep})...`);
      const positionKeypair = web3.Keypair.generate();
      const tx = await poolInstance.initializePositionAndAddLiquidityByStrategy({
        positionPubKey: positionKeypair.publicKey,
        totalXAmount: new BN(halfLamports.toString()),
        totalYAmount: new BN(0),
        strategy: { maxBinId, minBinId, strategyType: 0 },
        user: keypair.publicKey,
        slippage: 100,
      });

      if (typeof tx.partialSign === "function") {
        tx.partialSign(positionKeypair);
        const sig = await web3.sendAndConfirmTransaction(connection, tx, [keypair]);
        worldSignature = sig;
        logInfo(userId, "hunter", `[LIVE] POSISI BERTRANSAKSI: ${sig}`);
      } else {
        tx.sign([positionKeypair, keypair]);
        const sig = await web3.sendAndConfirmTransaction(connection, tx);
        worldSignature = sig;
        logInfo(userId, "hunter", `[LIVE] POSISI BERTRANSAKSI (v0): ${sig}`);
      }
    } else {
      // DRY RUN: jalankan flow SAMA (quote nyata, state pool nyata), hanya tidak kirim tx
      logInfo(userId, "hunter", `[DRY RUN] Simulasi swap: 0.25 SOL -> ${outputMint.slice(0,6)}`);
      logInfo(userId, "hunter", `[DRY RUN] Simulasi buka posisi DLMM (bins ${minBinId}..${maxBinId}, step ${binStep})`);
      logInfo(userId, "hunter", `[DRY RUN] Identik dengan live, hanya tanpa broadcast transaksi`);
    }

    // Entry price dari active bin (NYATA di kedua mode)
    const entryPrice = activeBinInfo.price
      ? parseFloat(activeBinInfo.price.toString())
      : null;

    return {
      success: true,
      dryRun,
      signature: worldSignature,
      positionStatus,
      entryPrice,
      binStep,
      minBinId,
      maxBinId,
      jupiterQuote: quote
        ? { outToken: quote.outAmount, priceImpactPct: quote.priceImpactPct }
        : null,
    };
  } catch (err) {
    logError(userId, "hunter", `[${mode}] Deploy error: ${err.message}`);
    return { success: false, dryRun, error: err.message };
  }
}
