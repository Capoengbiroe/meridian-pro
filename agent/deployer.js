import { logInfo, logError } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { decrypt } from "../lib/crypto.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function deployIntoPool(userId, pool, trading, risk) {
  try {
    logInfo(userId, "hunter", `Persiapan transaksi ke pool ${pool.address}...`);

    // Dynamic import seperti CloddsBot (hindari ESM error)
    const web3 = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
    const dlmmLib = await import("@meteora-ag/dlmm");
    const DLMM = dlmmLib.default || dlmmLib.DLMM;

    if (!DLMM) throw new Error("DLMM SDK tidak tersedia");

    const walletData = await prisma.wallet.findUnique({ where: { userId } });
    if (!walletData?.privateKeyEnc) throw new Error("Wallet tidak ditemukan");

    const privateKey = decrypt(walletData.privateKeyEnc);
    const keypair = web3.Keypair.fromSecretKey(bs58.decode(privateKey));
    const connection = new web3.Connection(trading.rpcUrl || "https://api.mainnet-beta.solana.com");

    // Buat DLMM instance
    const poolInstance = await DLMM.create(connection, new web3.PublicKey(pool.address));

    // Hitung active bin dan range
    const activeBin = poolInstance.activeBin;
    const binStep = poolInstance.binStep;
    const range = 10; // bin range kiri/kanan

    // Tentukan swap direction: SOL → Token (Y) atau Token → SOL
    const tokenXMint = poolInstance.tokenX.publicKey.toBase58();
    const isSolToToken = poolInstance.tokenX.publicKey.toBase58() === "So11111111111111111111111111111111111111112";

    const amountLamports = Math.floor(trading.deployAmountSol * 1e9);
    const swapAmount = BigInt(amountLamports);

    // Swap SOL → Token (untuk pasangan liquidity)
    const swapForY = poolInstance.tokenX.publicKey.toBase58() === "So11111111111111111111111111111111111111112";
    const swapAmountBN = BigInt(amountLamports);

    // 1. Swap SOL -> Token
    const binArrays = await poolInstance.getBinArrayForSwap(true);
    const quote = await poolInstance.swapQuote(swapAmountBN, true, BigInt(500), binArrays);

    const swapTx = await poolInstance.swap({
      inToken: poolInstance.tokenX.publicKey,
      outToken: poolInstance.tokenY.publicKey,
      inAmount: swapAmountBN,
      minOutAmount: quote.minOutAmount,
      lbPair: poolInstance.pubkey,
      user: keypair.publicKey,
      binArraysPubkey: quote.binArraysPubkey,
    });

    // 2. Add Liquidity (open position)
    const binArrayLower = await poolInstance.getBinArray(activeBin - 10);
    const binArrayUpper = await poolInstance.getBinArray(activeBin + 10);

    const positionTx = await poolInstance.openPosition({
      user: keypair.publicKey,
      lbPair: poolInstance.pubkey,
      totalXAmount: BigInt(0), // calculated by SDK
      totalYAmount: BigInt(0),
      minBinId: activeBin - 10,
      maxBinId: activeBin + 10,
      strategyType: "Spot",
    });

    const { signature } = await web3.sendAndConfirmTransaction(connection, positionTx, [keypair]);
    
    return { success: true, signature };
  } catch (err) {
    logError(userId, "hunter", `Deploy error: ${err.message}`);
    return { success: false, error: err.message };
  }
}
