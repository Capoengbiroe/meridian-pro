import { logInfo, logWarn, logError } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { decrypt } from "../lib/crypto.js";
import bs58 from "bs58";
import { executeJupiterSwap } from "./strategies.ts";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function deployIntoPool(userId, pool, trading, risk) {
  try {
    logInfo(userId, "hunter", `Persiapan transaksi ke pool ${pool.address} (${pool.tokenX?.slice(0,6)}/${pool.tokenY?.slice(0,6)})...`);

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

    logInfo(userId, "hunter", "Membuat DLMM instance...");
    const poolInstance = await DLMM.create(connection, new web3.PublicKey(pool.address));

    const activeBinInfo = await poolInstance.getActiveBin();
    const activeBinId = activeBinInfo.binId;
    const minBinId = activeBinId - 10;
    const maxBinId = activeBinId + 10;

    // ========== ROUTE A: Jupiter Aggregator (harga terbaik) ==========
    // Swap SOL -> token pasangan via Jupiter (best price lintas semua DEX)
    const halfLamports = Math.floor(trading.deployAmountSol * 1e9 / 2);
    const outputMint = pool.tokenX === "So11111111111111111111111111111111111111112"
      ? pool.tokenY : pool.tokenX;

    logInfo(userId, "hunter", "Swap via Jupiter aggregator...");
    const jupResult = await executeJupiterSwap(
      connection, keypair,
      SOL_MINT, outputMint,
      String(halfLamports), 100
    );

    if (!jupResult.success) {
      logWarn(userId, "hunter", `Jupiter swap gagal, fallback ke DLMM manual: ${jupResult.error}`);
    } else {
      logInfo(userId, "hunter", `Jupiter swap OK: ${jupResult.signature} (impact ${jupResult.priceImpactPct}%)`);
    }

    // ========== ROUTE B: Open position via DLMM (pola CloddsBot) ==========
    logInfo(userId, "hunter", "Buka posisi liquidity di Meteora DLMM...");
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
      const signature = await web3.sendAndConfirmTransaction(connection, tx, [keypair]);
      logInfo(userId, "hunter", `POSISI DIBUKA: ${signature}`);
      return { success: true, signature, positionAddress: positionKeypair.publicKey.toBase58() };
    } else {
      tx.sign([positionKeypair, keypair]);
      const signature = await web3.sendAndConfirmTransaction(connection, tx);
      logInfo(userId, "hunter", `POSISI DIBUKA (v0): ${signature}`);
      return { success: true, signature, positionAddress: positionKeypair.publicKey.toBase58() };
    }
  } catch (err) {
    logError(userId, "hunter", `Deploy error: ${err.message}`);
    return { success: false, error: err.message };
  }
}
