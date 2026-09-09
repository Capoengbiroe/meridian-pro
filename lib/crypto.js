import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function keyBytes(key) {
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 64);
}

export function encrypt(plaintext, masterKey = process.env.ENCRYPTION_KEY) {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(keyBytes(masterKey), "hex"), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(payload, masterKey = process.env.ENCRYPTION_KEY) {
  if (!payload) return "";
  const [ver, ivB64, tagB64, dataB64] = String(payload).split(":");
  if (ver === "v1") {
    const decipher = crypto.createDecipheriv(
      ALGO,
      Buffer.from(keyBytes(masterKey), "hex"),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return dec.toString("utf8");
  }
  throw new Error("Unsupported encryption version: " + ver);
}