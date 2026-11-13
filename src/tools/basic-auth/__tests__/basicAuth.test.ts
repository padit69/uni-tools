import { describe, expect, it } from "vitest";
import { buildCurl, buildFetch, buildHeader, decodeCredentials, encodeCredentials, shellQuote } from "../basicAuth";

describe("encodeCredentials", () => {
  it("encodes the RFC 7617 example", () => {
    expect(encodeCredentials("Aladdin", "open sesame")).toBe("QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
    expect(buildHeader("Aladdin", "open sesame")).toBe("Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
  });

  it("encodes UTF-8 (RFC 7617 test vector)", () => {
    expect(encodeCredentials("test", "123£")).toBe("dGVzdDoxMjPCow==");
    expect(encodeCredentials("người dùng", "mật khẩu🔑")).toBe(Buffer.from("người dùng:mật khẩu🔑", "utf8").toString("base64"));
  });
});

describe("snippets", () => {
  it("quotes shell values", () => {
    expect(shellQuote("it's")).toBe(`'it'\\''s'`);
    expect(buildCurl("a", "b'c")).toBe(`curl -u 'a:b'\\''c' 'https://example.com'`);
  });

  it("builds fetch snippet", () => {
    expect(buildFetch("Aladdin", "open sesame")).toContain(`Authorization: "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=="`);
  });
});

describe("decodeCredentials", () => {
  it("decodes full header, Basic prefix and bare token", () => {
    const expected = { ok: true, username: "Aladdin", password: "open sesame" };
    expect(decodeCredentials("Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==")).toEqual(expected);
    expect(decodeCredentials("basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==")).toEqual(expected);
    expect(decodeCredentials("  QWxhZGRpbjpvcGVuIHNlc2FtZQ  ")).toEqual(expected);
  });

  it("round-trips UTF-8 and keeps colons in password", () => {
    const token = encodeCredentials("người", "a:b:£");
    expect(decodeCredentials(token)).toEqual({ ok: true, username: "người", password: "a:b:£" });
  });

  it("reports errors", () => {
    expect(decodeCredentials("")).toEqual({ ok: false, error: "empty" });
    expect(decodeCredentials("not base64!")).toEqual({ ok: false, error: "invalidBase64" });
    expect(decodeCredentials(btoa("nocolon"))).toEqual({ ok: false, error: "missingColon" });
    expect(decodeCredentials(btoa("\xff\xfe:x"))).toEqual({ ok: false, error: "invalidUtf8" });
  });
});
