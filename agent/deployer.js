import { logInfo, logError } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { decrypt } from "../lib/crypto.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function deployIntoPool(userId, pool, trading, risk) {
  try {
    logInfo(userId, "hunter", `Persiapan transaksi ke pool ${pool.address}...`);

    const web3 = await import("@solana/web3.js");
    const bs58 = (await import("bs58")).default;
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

    const activeBin = poolInstance.activeBin;
    const binStep = poolInstance.binStep;
    const range = 10;

    // Swap SOL -> Token (amount in lamports)
    const amountLamports = Math.floor(trading.deployAmountSol * 1e9);
    const swapAmount = new BN(amountLamports.toString());

    // Swap SOL -> Token
    logInfo(userId, "hunter", "Swap SOL -> Token...");
    const binArrays = await poolInstance.getBinArrayForSwap(true);
    const quote = await poolInstance.swapQuote(swapAmount, true, new BN(500), binArrays);

    const swapTx = await poolInstance.swap({
      inToken: poolInstance.tokenX.publicKey,
      outToken: poolInstance.tokenY.publicKey,
      inAmount: swapAmount,
      minOutAmount: quote.minOutAmount,
      lbPair: poolInstance.pubkey,
      user: keypair.publicKey,
      binArraysPubkey: quote.binArraysPubkey,
    });

    // Open position (add liquidity)
    logInfo(userId, "hunter", "Membuka posisi liquidity...");
    const activeBin = poolInstance.activeBin;
    const positionTx = await poolInstance.openPosition({
      user: keypair.publicKey,
      lbPair: poolInstance.pubkey,
      totalXAmount: new BN(0),
      totalYAmount: new BN(0),
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
