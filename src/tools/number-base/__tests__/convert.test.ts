import { describe, expect, it } from "vitest";
import { bitLength, formatBigInt, groupBits, parseBigInt, signedWidth, twosComplement } from "../convert";

describe("parseBigInt", () => {
  it("parses common bases", () => {
    expect(parseBigInt("1010", 2)).toBe(10n);
    expect(parseBigInt("777", 8)).toBe(511n);
    expect(parseBigInt("255", 10)).toBe(255n);
    expect(parseBigInt("fF", 16)).toBe(255n);
    expect(parseBigInt("z", 36)).toBe(35n);
  });

  it("accepts prefixes, underscores and spaces", () => {
    expect(parseBigInt("0xff", 16)).toBe(255n);
    expect(parseBigInt("0b1111_0000", 2)).toBe(240n);
    expect(parseBigInt("0o17", 8)).toBe(15n);
    expect(parseBigInt("1 000 000", 10)).toBe(1000000n);
    expect(parseBigInt("0xFF", 10)).toBe(255n); // prefix overrides base
    expect(parseBigInt("-0x10", 16)).toBe(-16n);
  });

  it("does not treat digit letters as prefix in high bases", () => {
    // in hex, "0b1" is the number 0xb1
    expect(parseBigInt("0b1", 16)).toBe(0xb1n);
  });

  it("handles negatives and empty input", () => {
    expect(parseBigInt("-42", 10)).toBe(-42n);
    expect(parseBigInt("+7", 10)).toBe(7n);
    expect(parseBigInt("  ", 10)).toBeNull();
  });

  it("rejects invalid digits", () => {
    expect(() => parseBigInt("102", 2)).toThrow(/Invalid digit "2"/);
    expect(() => parseBigInt("1.5", 10)).toThrow();
    expect(() => parseBigInt("0x", 16)).toThrow();
    expect(() => parseBigInt("-", 10)).toThrow();
  });

  it("handles numbers larger than 2^53", () => {
    const big = "123456789012345678901234567890";
    const n = parseBigInt(big, 10)!;
    expect(formatBigInt(n, 10)).toBe(big);
    expect(parseBigInt(formatBigInt(n, 16), 16)).toBe(n);
    expect(parseBigInt(formatBigInt(n, 2), 2)).toBe(n);
    expect(formatBigInt(2n ** 64n - 1n, 16)).toBe("ffffffffffffffff");
  });
});

describe("formatBigInt", () => {
  it("formats in any base with sign", () => {
    expect(formatBigInt(255n, 2)).toBe("11111111");
    expect(formatBigInt(255n, 16, true)).toBe("FF");
    expect(formatBigInt(-255n, 16)).toBe("-ff");
    expect(formatBigInt(0n, 8)).toBe("0");
    expect(formatBigInt(35n, 36)).toBe("z");
  });
});

describe("bits", () => {
  it("bit length", () => {
    expect(bitLength(0n)).toBe(0);
    expect(bitLength(1n)).toBe(1);
    expect(bitLength(255n)).toBe(8);
    expect(bitLength(256n)).toBe(9);
    expect(bitLength(-8n)).toBe(4);
  });

  it("groups nibbles", () => {
    expect(groupBits("10101")).toBe("0001 0101");
    expect(groupBits("11110000")).toBe("1111 0000");
    expect(groupBits("")).toBe("");
  });

  it("two's complement", () => {
    expect(signedWidth(127n)).toBe(8);
    expect(signedWidth(128n)).toBe(16);
    expect(signedWidth(-128n)).toBe(8);
    expect(signedWidth(-129n)).toBe(16);
    expect(twosComplement(-1n, 8)).toBe("11111111");
    expect(twosComplement(-128n, 8)).toBe("10000000");
    expect(twosComplement(5n, 8)).toBe("00000101");
  });
});
