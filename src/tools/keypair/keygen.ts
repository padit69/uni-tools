export type KeyFamily = "RSA" | "ECDSA" | "Ed25519";
export type RsaAlgorithm = "RSA-OAEP" | "RSASSA-PKCS1-v1_5" | "RSA-PSS";
export type RsaSize = 2048 | 3072 | 4096;
export type EcCurve = "P-256" | "P-384" | "P-521";

export type KeyConfig =
  | { family: "RSA"; algorithm: RsaAlgorithm; modulusLength: RsaSize; hash?: "SHA-256" | "SHA-384" | "SHA-512" }
  | { family: "ECDSA"; curve: EcCurve }
  | { family: "Ed25519" };

export interface GeneratedKeyPair {
  publicPem: string;
  privatePem: string;
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
  fingerprintHex: string;
  fingerprintBase64: string;
}

export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}

/** Wraps DER bytes in a PEM block with 64-character base64 lines. */
export function pemWrap(label: string, der: ArrayBuffer | Uint8Array): string {
  const b64 = bytesToBase64(der);
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}${lines.length ? "\n" : ""}-----END ${label}-----\n`;
}

export function pemUnwrap(pem: string): Uint8Array {
  const b64 = pem.replace(/-----(BEGIN|END) [^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function toHexColon(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(u8, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

export function generationParams(config: KeyConfig): { algorithm: AlgorithmIdentifier | RsaHashedKeyGenParams | EcKeyGenParams; usages: KeyUsage[] } {
  switch (config.family) {
    case "RSA":
      return {
        algorithm: {
          name: config.algorithm,
          modulusLength: config.modulusLength,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: config.hash ?? "SHA-256",
        },
        usages: config.algorithm === "RSA-OAEP" ? ["encrypt", "decrypt"] : ["sign", "verify"],
      };
    case "ECDSA":
      return { algorithm: { name: "ECDSA", namedCurve: config.curve }, usages: ["sign", "verify"] };
    case "Ed25519":
      return { algorithm: { name: "Ed25519" }, usages: ["sign", "verify"] };
  }
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto is not available in this context (requires HTTPS or localhost).");
  return subtle;
}

let ed25519Support: Promise<boolean> | null = null;
export function isEd25519Supported(): Promise<boolean> {
  if (!ed25519Support) {
    ed25519Support = (async () => {
      try {
        await getSubtle().generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
        return true;
      } catch {
        return false;
      }
    })();
  }
  return ed25519Support;
}

export async function sha256Fingerprint(spki: ArrayBuffer | Uint8Array): Promise<{ hex: string; base64: string }> {
  const buf = spki instanceof Uint8Array ? spki : new Uint8Array(spki);
  const digest = await getSubtle().digest("SHA-256", buf as BufferSource);
  return { hex: toHexColon(digest), base64: bytesToBase64(digest).replace(/=+$/, "") };
}

export async function generateKeyPair(config: KeyConfig): Promise<GeneratedKeyPair> {
  const subtle = getSubtle();
  const { algorithm, usages } = generationParams(config);
  const pair = (await subtle.generateKey(algorithm, true, usages)) as CryptoKeyPair;
  const [spki, pkcs8, publicJwk, privateJwk] = await Promise.all([
    subtle.exportKey("spki", pair.publicKey),
    subtle.exportKey("pkcs8", pair.privateKey),
    subtle.exportKey("jwk", pair.publicKey),
    subtle.exportKey("jwk", pair.privateKey),
  ]);
  const fp = await sha256Fingerprint(spki);
  return {
    publicPem: pemWrap("PUBLIC KEY", spki),
    privatePem: pemWrap("PRIVATE KEY", pkcs8),
    publicJwk,
    privateJwk,
    fingerprintHex: fp.hex,
    fingerprintBase64: fp.base64,
  };
}

/** Short slug for file names, e.g. "rsa-oaep-2048", "ecdsa-p-256", "ed25519". */
export function keyFileBase(config: KeyConfig): string {
  const raw =
    config.family === "RSA" ? `${config.algorithm}-${config.modulusLength}` : config.family === "ECDSA" ? `ecdsa-${config.curve}` : "ed25519";
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
