import { describe, expect, it } from "vitest";
import { convertCase, convertText, splitWords, stripDiacritics } from "../convert";

describe("splitWords", () => {
  it("splits on separators", () => {
    expect(splitWords("foo_bar-baz qux.quux/x")).toEqual(["foo", "bar", "baz", "qux", "quux", "x"]);
    expect(splitWords("  --hello__world--  ")).toEqual(["hello", "world"]);
  });

  it("splits camel and Pascal case", () => {
    expect(splitWords("fooBarBaz")).toEqual(["foo", "Bar", "Baz"]);
    expect(splitWords("FooBar")).toEqual(["Foo", "Bar"]);
  });

  it("handles acronyms", () => {
    expect(splitWords("XMLHttpRequest")).toEqual(["XML", "Http", "Request"]);
    expect(splitWords("getHTTPResponseCode")).toEqual(["get", "HTTP", "Response", "Code"]);
    expect(splitWords("parseURL")).toEqual(["parse", "URL"]);
    expect(splitWords("IOError")).toEqual(["IO", "Error"]);
    expect(splitWords("CONSTANT_VALUE")).toEqual(["CONSTANT", "VALUE"]);
  });

  it("handles numbers", () => {
    expect(splitWords("utf8Encode")).toEqual(["utf8", "Encode"]);
    expect(splitWords("version2Beta")).toEqual(["version2", "Beta"]);
    expect(splitWords("base64_to_hex")).toEqual(["base64", "to", "hex"]);
    expect(splitWords("ABC123Def")).toEqual(["ABC123", "Def"]);
    expect(splitWords("item 42")).toEqual(["item", "42"]);
  });

  it("keeps unicode letters and drops apostrophes", () => {
    expect(splitWords("Xin chào thế giới")).toEqual(["Xin", "chào", "thế", "giới"]);
    expect(splitWords("don't stop")).toEqual(["dont", "stop"]);
  });
});

describe("convertCase", () => {
  const s = "XMLHttpRequest handler v2";
  it.each([
    ["camel", "xmlHttpRequestHandlerV2"],
    ["pascal", "XmlHttpRequestHandlerV2"],
    ["snake", "xml_http_request_handler_v2"],
    ["constant", "XML_HTTP_REQUEST_HANDLER_V2"],
    ["kebab", "xml-http-request-handler-v2"],
    ["train", "Xml-Http-Request-Handler-V2"],
    ["dot", "xml.http.request.handler.v2"],
    ["path", "xml/http/request/handler/v2"],
    ["title", "Xml Http Request Handler V2"],
    ["sentence", "Xml http request handler v2"],
    ["lower", "xmlhttprequest handler v2"],
    ["upper", "XMLHTTPREQUEST HANDLER V2"],
    ["slug", "xml-http-request-handler-v2"],
  ] as const)("%s", (id, expected) => {
    expect(convertCase(s, id)).toBe(expected);
  });

  it("slugifies Vietnamese", () => {
    expect(convertCase("Đường đến Hà Nội — năm 2024!", "slug")).toBe("duong-den-ha-noi-nam-2024");
    expect(convertCase("Tiếng Việt có dấu: ỡ ữ ặ", "slug")).toBe("tieng-viet-co-dau-o-u-a");
  });

  it("strips diacritics (decomposed input too)", () => {
    expect(stripDiacritics("Đà Nẵng")).toBe("Da Nang");
    expect(stripDiacritics("Việt")).toBe("Viet");
  });

  it("returns empty for empty input", () => {
    expect(convertCase("", "camel")).toBe("");
    expect(convertCase("", "slug")).toBe("");
  });
});

describe("convertText", () => {
  it("converts line by line", () => {
    expect(convertText("first name\nlast name", "camel", { lineByLine: true })).toBe("firstName\nlastName");
    expect(convertText("first name\nlast name", "camel")).toBe("firstNameLastName");
  });

  it("optionally removes diacritics", () => {
    expect(convertText("họ tên", "snake", { removeDiacritics: true })).toBe("ho_ten");
    expect(convertText("họ tên", "snake")).toBe("họ_tên");
  });
});
