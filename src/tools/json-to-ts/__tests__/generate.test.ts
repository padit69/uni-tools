import { describe, expect, it } from "vitest";
import { generate, generateFromJson, propertyKey, singularize, toPascalCase } from "../generate";

describe("helpers", () => {
  it("PascalCases keys", () => {
    expect(toPascalCase("user_profile")).toBe("UserProfile");
    expect(toPascalCase("billing-address")).toBe("BillingAddress");
    expect(toPascalCase("homeAddress")).toBe("HomeAddress");
    expect(toPascalCase("1st")).toBe("T1st");
  });

  it("singularizes simple plurals", () => {
    expect(singularize("Users")).toBe("User");
    expect(singularize("Categories")).toBe("Category");
    expect(singularize("Boxes")).toBe("Box");
    expect(singularize("Status")).toBe("Status");
    expect(singularize("Address")).toBe("Address");
  });

  it("quotes invalid identifiers", () => {
    expect(propertyKey("name")).toBe("name");
    expect(propertyKey("$id")).toBe("$id");
    expect(propertyKey("first-name")).toBe('"first-name"');
    expect(propertyKey("2fa")).toBe('"2fa"');
    expect(propertyKey("a b")).toBe('"a b"');
  });
});

describe("generate (TypeScript)", () => {
  it("emits interfaces for nested objects", () => {
    const out = generate({ id: 1, name: "a", active: true, profile: { avatar_url: "x" } });
    expect(out).toBe(
      [
        "export interface Root {",
        "  id: number;",
        "  name: string;",
        "  active: boolean;",
        "  profile: Profile;",
        "}",
        "",
        "export interface Profile {",
        "  avatar_url: string;",
        "}",
        "",
      ].join("\n")
    );
  });

  it("merges array item shapes: optional keys, unions, null", () => {
    const out = generate({
      users: [
        { id: 1, email: "a@b.c", age: 3 },
        { id: "2", email: null },
      ],
    });
    expect(out).toContain("users: User[];");
    expect(out).toContain("export interface User {");
    expect(out).toContain("  id: string | number;");
    expect(out).toContain("  email: string | null;");
    expect(out).toContain("  age?: number;");
  });

  it("handles mixed and empty arrays", () => {
    const out = generate({ a: [1, "x"], b: [], c: [[1, 2]] });
    expect(out).toContain("a: (string | number)[];");
    expect(out).toContain("b: unknown[];");
    expect(out).toContain("c: number[][];");
  });

  it("supports type aliases, readonly and all-optional", () => {
    const out = generate({ a: 1, tags: ["x"] }, { declaration: "type", readonly: true, allOptional: true });
    expect(out).toBe(
      ["export type Root = {", "  readonly a?: number;", "  readonly tags?: readonly string[];", "};", ""].join("\n")
    );
  });

  it("uses custom root name and handles array roots", () => {
    const out = generate([{ id: 1 }, { id: 2, x: true }], { rootName: "orders" });
    expect(out).toContain("export type Orders = Order[];");
    expect(out).toContain("export interface Order {\n  id: number;\n  x?: boolean;\n}");
  });

  it("primitive roots and null-only fields", () => {
    expect(generate("x")).toBe("export type Root = string;\n");
    expect(generate({ a: null })).toContain("a: null;");
    expect(generate({})).toBe("export type Root = Record<string, unknown>;\n");
  });

  it("quotes keys and dedupes clashing type names", () => {
    const out = generate({ "first-name": "a", item: { a: 1 }, other: { item: { b: 2 } } });
    expect(out).toContain('"first-name": string;');
    expect(out).toContain("export interface Item {");
    expect(out).toContain("export interface Item2 {");
  });

  it("falls back to <Name>Item when singular equals the key", () => {
    const out = generate({ data: [{ a: 1 }] });
    expect(out).toContain("data: DataItem[];");
  });
});

describe("generate (Zod)", () => {
  it("emits schemas in dependency order", () => {
    const out = generateFromJson(`{"id":1,"tags":["a"],"owner":{"name":"x","nick":null},"items":[{"a":1},{"b":"x"}]}`, {
      zod: true,
    });
    expect(out.startsWith('import { z } from "zod";')).toBe(true);
    const owner = out.indexOf("const OwnerSchema");
    const item = out.indexOf("const ItemSchema");
    const root = out.indexOf("const RootSchema");
    expect(owner).toBeGreaterThan(0);
    expect(item).toBeGreaterThan(0);
    expect(root).toBeGreaterThan(owner);
    expect(root).toBeGreaterThan(item);
    expect(out).toContain("  nick: z.null(),");
    expect(out).toContain("  a: z.number().optional(),");
    expect(out).toContain("  tags: z.array(z.string()),");
    expect(out).toContain("  items: z.array(ItemSchema),");
    expect(out).toContain("export type Root = z.infer<typeof RootSchema>;");
  });

  it("nullable unions", () => {
    const out = generate({ v: [1, "a", null] }, { zod: true });
    expect(out).toContain("v: z.array(z.union([z.string(), z.number()]).nullable()),");
  });

  it("throws on invalid JSON", () => {
    expect(() => generateFromJson("{")).toThrow();
  });
});
