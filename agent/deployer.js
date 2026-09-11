import { logInfo, logWarn, logError } from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { decrypt } from "../lib/crypto.js";

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

    // Bagi modal: 50% dipakai swap ke token, 50% untuk liquidity
    const halfLamports = Math.floor(trading.deployAmountSol * 1e9 / 2);
    const preSwapAmount = new BN(halfLamports.toString());

    // 1. Swap SOL -> Token
    logInfo(userId, "hunter", "Swap SOL untuk pasangan likuiditas...");
    try {
      const binArrays = await poolInstance.getBinArrayForSwap(true);
      const quote = await poolInstance.swapQuote(preSwapAmount, true, new BN(300), binArrays);
      const swapTx = await poolInstance.swap({
        inToken: poolInstance.tokenX.publicKey,
        outToken: poolInstance.tokenY.publicKey,
        inAmount: preSwapAmount,
        minOutAmount: quote.minOutAmount,
        lbPair: poolInstance.pubkey,
        user: keypair.publicKey,
        binArraysPubkey: quote.binArraysPubkey,
      });
      const sig = await web3.sendAndConfirmTransaction(connection, swapTx, [keypair]);
      logInfo(userId, "hunter", `Swap OK: ${sig}`);
    } catch (swapErr) {
      logWarn(userId, "hunter", `Swap dilewati: ${swapErr.message}`);
    }

    // 2. Buka posisi + add liquidity (pola CloddsBot)
    logInfo(userId, "hunter", "Membuka posisi liquidity...");
    const activeBinInfo = await poolInstance.getActiveBin();
    const activeBinId = activeBinInfo.binId;
    const minBinId = activeBinId - 10;
    const maxBinId = activeBinId + 10;

    const positionKeypair = web3.Keypair.generate();
    const tx = await poolInstance.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: positionKeypair.publicKey,
      totalXAmount: new BN(halfLamports.toString()),
      totalYAmount: new BN(0),
      strategy: { maxBinId, minBinId, strategyType: 0 },
      user: keypair.publicKey,
      slippage: 50,
    });

    // Tanda tangani keypair posisi (dukung Transaction & VersionedTransaction)
    if (typeof tx.partialSign === "function") {
      tx.partialSign(positionKeypair);
      const signature = await web3.sendAndConfirmTransaction(connection, tx, [keypair]);
      logInfo(userId, "hunter", `POSISI DIBUKA: ${signature}`);
    } else {
      tx.sign([positionKeypair, keypair]);
      const signature = await web3.sendAndConfirmTransaction(connection, tx);
      logInfo(userId, "hunter", `POSISI DIBUKA (v0): ${signature}`);
    }
    return { success: true, signature, positionAddress: positionKeypair.publicKey.toBase58() };
  } catch (err) {
    logError(userId, "hunter", `Deploy error: ${err.message}`);
    return { success: false, error: err.message };
  }
}
