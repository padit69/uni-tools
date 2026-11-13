import { describe, expect, it } from "vitest";
import {
  exportAnthropicMessages,
  exportJsTemplate,
  exportJson,
  exportOpenAIMessages,
  parseVariables,
  renderSegments,
  renderTemplate,
  unfilledVariables,
} from "../template";

describe("parseVariables", () => {
  it("detects unique variables in order with defaults", () => {
    const tpl = "Hi {{ name }}, write in {{tone|friendly}} tone about {{topic}}. Bye {{name}}.";
    expect(parseVariables(tpl)).toEqual([
      { name: "name" },
      { name: "tone", defaultValue: "friendly" },
      { name: "topic" },
    ]);
  });

  it("supports empty defaults, dotted names and ignores invalid placeholders", () => {
    expect(parseVariables("{{user.name|}} {{1bad}} {{ }} {x}")).toEqual([{ name: "user.name", defaultValue: "" }]);
  });

  it("takes a default declared on a later occurrence", () => {
    expect(parseVariables("{{a}} {{a|x}}")).toEqual([{ name: "a", defaultValue: "x" }]);
  });

  it("returns empty for plain text", () => {
    expect(parseVariables("no vars here")).toEqual([]);
  });
});

describe("renderTemplate", () => {
  it("substitutes values, falls back to defaults and keeps unfilled placeholders", () => {
    const tpl = "{{greet|Hello}} {{name}}! {{missing}}";
    expect(renderTemplate(tpl, { name: "Ana" })).toBe("Hello Ana! {{missing}}");
    expect(renderTemplate(tpl, { greet: "Hi", name: "Ana", missing: "ok" })).toBe("Hi Ana! ok");
    expect(unfilledVariables(tpl, { name: "" })).toEqual(["name", "missing"]);
  });

  it("does not re-expand placeholders inside values", () => {
    expect(renderTemplate("{{a}}-{{b}}", { a: "{{b}}", b: "x" })).toBe("{{b}}-x");
  });

  it("produces highlight segments", () => {
    expect(renderSegments("A {{x}} B", {})).toEqual([
      { kind: "text", text: "A " },
      { kind: "var", name: "x", text: "{{x}}", filled: false },
      { kind: "text", text: " B" },
    ]);
  });
});

describe("exports", () => {
  it("exports JSON with variables", () => {
    expect(JSON.parse(exportJson("{{a}} {{b|d}}", { a: "1" }))).toEqual({
      template: "{{a}} {{b|d}}",
      variables: { a: "1", b: "d" },
    });
  });

  it("exports messages arrays", () => {
    expect(JSON.parse(exportOpenAIMessages("sys", "hi"))).toEqual({
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
      ],
    });
    expect(JSON.parse(exportOpenAIMessages("", "hi"))).toEqual({ messages: [{ role: "user", content: "hi" }] });
    expect(JSON.parse(exportAnthropicMessages("sys", "hi"))).toEqual({
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
    });
  });

  it("exports a JS template literal with escaping", () => {
    const js = exportJsTemplate("Use `code` and ${x} for {{user-name}} in {{lang|vi}}");
    expect(js).toBe(
      'export const buildPrompt = ({ "user-name": user_name, lang = "vi" }) => `Use \\`code\\` and \\${x} for ${user_name} in ${lang}`;\n'
    );
    const fn = new Function(js.replace("export const buildPrompt =", "return"))();
    expect(fn({ "user-name": "Bo" })).toBe("Use `code` and ${x} for Bo in vi");
  });
});
