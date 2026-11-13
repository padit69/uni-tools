import { describe, expect, it } from "vitest";
import { generateKeyPair, keyFileBase, pemUnwrap, pemWrap, sha256Fingerprint, toHexColon } from "../keygen";

describe("pemWrap", () => {
  it("wraps bytes into 64-char lines with header/footer", () => {
    const der = new Uint8Array(100).map((_, i) => i);
    const pem = pemWrap("PUBLIC KEY", der);
    const lines = pem.trimEnd().split("\n");
    expect(lines[0]).toBe("-----BEGIN PUBLIC KEY-----");
    expect(lines[lines.length - 1]).toBe("-----END PUBLIC KEY-----");
    const body = lines.slice(1, -1);
    expect(body.slice(0, -1).every((l) => l.length === 64)).toBe(true);
    expect(body.join("")).toBe(Buffer.from(der).toString("base64"));
    expect(pem.endsWith("\n")).toBe(true);
  });

  it("round-trips through pemUnwrap", () => {
    const der = new Uint8Array([0, 255, 1, 2, 3, 128]);
    expect(Array.from(pemUnwrap(pemWrap("PRIVATE KEY", der)))).toEqual(Array.from(der));
  });

  it("handles exact multiples of 64 chars and empty input", () => {
    const der = new Uint8Array(48); // 64 base64 chars
    expect(pemWrap("X", der).split("\n")).toHaveLength(4);
    expect(pemWrap("X", new Uint8Array())).toBe("-----BEGIN X-----\n-----END X-----\n");
  });
});

describe("helpers", () => {
  it("formats hex fingerprints", () => {
    expect(toHexColon(new Uint8Array([0, 15, 255]))).toBe("00:0F:FF");
  });

  it("computes SHA-256 fingerprint", async () => {
    const fp = await sha256Fingerprint(new TextEncoder().encode("abc"));
    expect(fp.hex.startsWith("BA:78:16:BF")).toBe(true);
    expect(fp.base64).toBe("ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0");
  });

  it("builds file names", () => {
    expect(keyFileBase({ family: "RSA", algorithm: "RSA-OAEP", modulusLength: 2048 })).toBe("rsa-oaep-2048");
    expect(keyFileBase({ family: "ECDSA", curve: "P-256" })).toBe("ecdsa-p-256");
  });
});

const hasSubtle = !!globalThis.crypto?.subtle;

describe.runIf(hasSubtle)("generateKeyPair (WebCrypto)", () => {
  it("generates an ECDSA P-256 key pair", async () => {
    const kp = await generateKeyPair({ family: "ECDSA", curve: "P-256" });
    expect(kp.publicPem).toMatch(/^-----BEGIN PUBLIC KEY-----\n/);
    expect(kp.privatePem).toMatch(/^-----BEGIN PRIVATE KEY-----\n/);
    expect(kp.publicJwk.crv).toBe("P-256");
    expect(kp.privateJwk.d).toBeTruthy();
    expect(kp.fingerprintHex.split(":")).toHaveLength(32);
    const fp = await sha256Fingerprint(pemUnwrap(kp.publicPem));
    expect(fp.hex).toBe(kp.fingerprintHex);
  });

  it("generates an RSA-PSS 2048 key pair", async () => {
    const kp = await generateKeyPair({ family: "RSA", algorithm: "RSA-PSS", modulusLength: 2048 });
    expect(kp.publicJwk.kty).toBe("RSA");
    expect(kp.publicJwk.alg).toBe("PS256");
  });
});
