const start = Date.now();
const { Connection } = require("@solana/web3.js");
const dlmmLib = require("@meteora-ag/dlmm");
const DLMM = dlmmLib.default || dlmmLib.DLMM || dlmmLib;
(async () => {
  const conn = new Connection("https://mainnet.helius-rpc.com/?api-key=2799f6ed-5b9c-48e7-b638-d93460cdf743", "confirmed");
  const pairs = await DLMM.getLbPairs(conn);
  console.log("POOLS:", pairs?.length, "DURASI:", Date.now()-start, "ms");
  const p = (pairs||[])[0];
  console.log("SAMPLE:", p.publicKey?.toBase58?.());
})().catch(e => { console.error("ERR:", e.message); process.exit(1); });
