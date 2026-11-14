import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { _resetFileDrop, deliverFile, looksBinary, routeFile, useFileDrop } from "../fileDrop";

const r = (name: string, text: string, mime = "") => routeFile(name, mime, text);

describe("routeFile", () => {
  it("routes JSON variants", () => {
    expect(r("data.json", '{"a":1}')).toEqual({ toolId: "json" });
    expect(r("broken.json", "{oops")).toEqual({ toolId: "json" });
    expect(r("noext", "[1,2]")).toEqual({ toolId: "json" });
    expect(r("x.json", '{"type":"uni-tools/mini-draw","version":1,"elements":[]}')).toEqual({ toolId: "mini-draw" });
    expect(r("api.json", '{"openapi":"3.0.0"}')).toEqual({ toolId: "postman-docs" });
    expect(r("c.json", '{"info":{"schema":"https://schema.getpostman.com/json/collection/v2.1.0/collection.json"}}')).toEqual({ toolId: "postman-docs" });
  });

  it("routes YAML, CSV, XML to JSON convert (or API docs for specs)", () => {
    expect(r("a.yaml", "a: 1")).toEqual({ toolId: "json", convertFrom: "yaml" });
    expect(r("spec.yml", "openapi: 3.0.0\ninfo: {}")).toEqual({ toolId: "postman-docs" });
    expect(r("a.csv", "a,b\n1,2")).toEqual({ toolId: "json", convertFrom: "csv" });
    expect(r("a.xml", "<a/>")).toEqual({ toolId: "json", convertFrom: "xml" });
  });

  it("routes code and docs", () => {
    expect(r("README.md", "# hi")).toEqual({ toolId: "markdown" });
    expect(r("q.sql", "select 1")).toEqual({ toolId: "sql" });
    expect(r("i.html", "<p>")).toEqual({ toolId: "beautifier", lang: "html" });
    expect(r("s.scss", "a{}")).toEqual({ toolId: "beautifier", lang: "css" });
    expect(r("App.tsx", "export {}")).toEqual({ toolId: "beautifier", lang: "js" });
    expect(r(".env", "A=1")).toEqual({ toolId: "config" });
    expect(r(".env.local", "A=1")).toEqual({ toolId: "config" });
    expect(r("token.txt", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc")).toEqual({ toolId: "jwt" });
    expect(r("notes.txt", "hello world")).toEqual({ toolId: "text-tools" });
  });

  it("rejects binary files", () => {
    expect(r("a.png", "\u0089PNG", "image/png")).toBeNull();
    expect(r("a.bin", "ab\u0000cd")).toBeNull();
    expect(looksBinary("plain\ttext\n")).toBe(false);
  });
});

describe("file hand-off", () => {
  afterEach(() => _resetFileDrop());

  it("delivers a pending file when the tool mounts", () => {
    deliverFile({ toolId: "json", text: "{}", fileName: "a.json" });
    const handler = vi.fn();
    renderHook(() => useFileDrop("json", handler));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ fileName: "a.json" }));
  });

  it("delivers directly to a mounted tool and ignores other tools", () => {
    const json = vi.fn();
    const md = vi.fn();
    renderHook(() => useFileDrop("json", json));
    renderHook(() => useFileDrop("markdown", md));
    deliverFile({ toolId: "markdown", text: "# x", fileName: "x.md" });
    expect(md).toHaveBeenCalledTimes(1);
    expect(json).not.toHaveBeenCalled();
  });
});

describe("cross-tab hand-off", () => {
  afterEach(() => _resetFileDrop());

  it("returns false when the popup is blocked", async () => {
    const { openFileInNewTab } = await import("../fileDrop");
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    expect(openFileInNewTab("/tools/json", { toolId: "json", text: "{}", fileName: "a.json" })).toBe(false);
    open.mockRestore();
  });

  it("transfers the file to the new tab over BroadcastChannel", async () => {
    const { openFileInNewTab, receiveFileFromOpener } = await import("../fileDrop");
    let url = "";
    const open = vi.spyOn(window, "open").mockImplementation((u) => {
      url = String(u);
      return {} as Window;
    });
    expect(openFileInNewTab("/tools/json", { toolId: "json", text: '{"a":1}', fileName: "a.json" })).toBe(true);
    const id = new URL(url, "http://x").searchParams.get("drop")!;
    // Simulate the new tab: its own channel instance on the same name.
    const other = new BroadcastChannel("uni-tools:file-drop");
    const got = new Promise((resolve) => {
      other.onmessage = (e) => e.data.type === "payload" && resolve(e.data.file);
    });
    other.postMessage({ type: "request", id });
    await expect(got).resolves.toMatchObject({ fileName: "a.json", text: '{"a":1}' });
    other.close();
    open.mockRestore();
    expect(typeof receiveFileFromOpener).toBe("function");
  });
});
