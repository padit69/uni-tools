import { describe, expect, it } from "vitest";
import {
  hasBit,
  modeToChmodSymbolic,
  modeToOctal,
  modeToSymbolic,
  parseOctal,
  parseSymbolic,
  permBit,
  shellQuote,
  specialBit,
  toggleBit,
} from "../chmod";

describe("octal", () => {
  it("formats 3 digits normally and 4 with special bits", () => {
    expect(modeToOctal(0o755)).toBe("755");
    expect(modeToOctal(0o644)).toBe("644");
    expect(modeToOctal(0o7)).toBe("007");
    expect(modeToOctal(0o4755)).toBe("4755");
    expect(modeToOctal(0o1777)).toBe("1777");
  });

  it("parses 1–4 octal digits", () => {
    expect(parseOctal("755")).toBe(0o755);
    expect(parseOctal("0755")).toBe(0o755);
    expect(parseOctal("4755")).toBe(0o4755);
    expect(parseOctal(" 7 ")).toBe(0o7);
  });

  it.each(["", "8", "789", "12345", "rwx", "7a5"])("rejects %j", (s) => {
    expect(parseOctal(s)).toBeNull();
  });
});

describe("symbolic", () => {
  it.each([
    [0o755, "rwxr-xr-x"],
    [0o644, "rw-r--r--"],
    [0o000, "---------"],
    [0o777, "rwxrwxrwx"],
    [0o4755, "rwsr-xr-x"],
    [0o4644, "rwSr--r--"],
    [0o2755, "rwxr-sr-x"],
    [0o2745, "rwxr-Sr-x"],
    [0o1777, "rwxrwxrwt"],
    [0o1776, "rwxrwxrwT"],
    [0o7777, "rwsrwsrwt"],
  ])("%o <-> %s", (mode, sym) => {
    expect(modeToSymbolic(mode)).toBe(sym);
    expect(parseSymbolic(sym)).toBe(mode);
  });

  it("accepts ls -l style with a leading type char", () => {
    expect(parseSymbolic("-rwxr-xr-x")).toBe(0o755);
    expect(parseSymbolic("drwxrwxrwt")).toBe(0o1777);
  });

  it.each(["rwx", "rwxr-xr-xx", "xwrr-xr-x", "rwxr-tr-x", "rwtr-xr-x", "zrwxr-xr-x", "rw-r--r-s"])("rejects %j", (s) => {
    expect(parseSymbolic(s)).toBeNull();
  });

  it("round-trips every mode", () => {
    for (let m = 0; m <= 0o7777; m++) {
      expect(parseSymbolic(modeToSymbolic(m))).toBe(m);
      expect(parseOctal(modeToOctal(m))).toBe(m);
    }
  });
});

describe("bits", () => {
  it("toggles permission and special bits", () => {
    let m = 0;
    m = toggleBit(m, permBit("owner", "read"), true);
    m = toggleBit(m, permBit("owner", "write"), true);
    m = toggleBit(m, permBit("group", "read"), true);
    m = toggleBit(m, permBit("other", "execute"), true);
    expect(modeToOctal(m)).toBe("641");
    m = toggleBit(m, specialBit("setgid"), true);
    expect(modeToOctal(m)).toBe("2641");
    m = toggleBit(m, permBit("owner", "write"), false);
    expect(modeToOctal(m)).toBe("2441");
    expect(hasBit(m, specialBit("setgid"))).toBe(true);
    expect(hasBit(m, specialBit("sticky"))).toBe(false);
  });
});

describe("chmod symbolic command form", () => {
  it("renders u/g/o assignments", () => {
    expect(modeToChmodSymbolic(0o755)).toBe("u=rwx,g=rx,o=rx");
    expect(modeToChmodSymbolic(0o640)).toBe("u=rw,g=r,o=");
    expect(modeToChmodSymbolic(0o4755)).toBe("u=rwxs,g=rx,o=rx");
    expect(modeToChmodSymbolic(0o1777)).toBe("u=rwx,g=rwx,o=rwxt");
  });
});

describe("shellQuote", () => {
  it("leaves simple names unquoted and quotes the rest", () => {
    expect(shellQuote("script.sh")).toBe("script.sh");
    expect(shellQuote("/var/www/html")).toBe("/var/www/html");
    expect(shellQuote("my file")).toBe("'my file'");
    expect(shellQuote("it's")).toBe(`'it'\\''s'`);
    expect(shellQuote("")).toBe("file");
  });
});
