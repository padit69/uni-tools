import { lazy } from "react";
import {
  Braces,
  KeyRound,
  Link as LinkIcon,
  ShieldCheck,
  Fingerprint,
  Hash,
  QrCode,
  Type as TypeIcon,
  Clock,
  Palette,
  Ruler,
  GitCompare,
  Regex as RegexIcon,
  FileText,
  Shield,
  Quote,
  Terminal,
} from "lucide-react";
import type { Tool, ToolCategory } from "./types";
import { categories } from "./types";

export const tools: Tool[] = [
  /* JSON */
  {
    id: "json",
    slug: "json",
    name: "JSON Tool",
    category: "json",
    icon: Braces,
    description: "Format, validate, xem cây và convert JSON ↔ YAML/CSV/XML",
    keywords: ["json", "format", "minify", "beautify", "validate", "tree", "yaml", "csv", "xml"],
    Component: lazy(() => import("./json/JsonTool")),
    shortcut: "⌘+J",
  },

  /* Encode / Decode */
  {
    id: "base64",
    slug: "base64",
    name: "Base64",
    category: "encode",
    icon: KeyRound,
    description: "Encode / decode Base64 (UTF-8 safe)",
    keywords: ["base64", "encode", "decode", "btoa", "atob"],
    Component: lazy(() => import("./base64/Tool")),
  },
  {
    id: "url",
    slug: "url",
    name: "URL Encode",
    category: "encode",
    icon: LinkIcon,
    description: "Encode / decode URL (component & uri)",
    keywords: ["url", "encode", "decode", "percent", "uri"],
    Component: lazy(() => import("./url/Tool")),
  },
  {
    id: "jwt",
    slug: "jwt",
    name: "JWT Decoder",
    category: "encode",
    icon: ShieldCheck,
    description: "Decode JWT — header, payload, signature (không verify)",
    keywords: ["jwt", "json web token", "decode", "auth", "bearer"],
    Component: lazy(() => import("./jwt/Tool")),
  },

  /* Generators */
  {
    id: "uuid",
    slug: "uuid",
    name: "UUID",
    category: "generate",
    icon: Fingerprint,
    description: "Sinh UUID v4 / v7 / Nil, hỗ trợ batch",
    keywords: ["uuid", "guid", "v4", "v7", "id"],
    Component: lazy(() => import("./uuid/Tool")),
  },
  {
    id: "hash",
    slug: "hash",
    name: "Hash",
    category: "generate",
    icon: Hash,
    description: "SHA-1 / SHA-256 / SHA-384 / SHA-512 qua Web Crypto",
    keywords: ["hash", "sha", "sha256", "checksum", "digest"],
    Component: lazy(() => import("./hash/Tool")),
  },
  {
    id: "qr",
    slug: "qr",
    name: "QR Code",
    category: "generate",
    icon: QrCode,
    description: "Sinh QR code, tải file PNG",
    keywords: ["qr", "qrcode", "barcode"],
    Component: lazy(() => import("./qr/Tool")),
  },
  {
    id: "lorem",
    slug: "lorem",
    name: "Lorem Ipsum",
    category: "generate",
    icon: TypeIcon,
    description: "Sinh text mẫu Lorem ipsum (đoạn / câu / từ)",
    keywords: ["lorem", "ipsum", "placeholder", "text", "dummy"],
    Component: lazy(() => import("./lorem/Tool")),
  },
  {
    id: "password",
    slug: "password",
    name: "Password",
    category: "generate",
    icon: Shield,
    description: "Sinh password ngẫu nhiên + passphrase, đo strength",
    keywords: ["password", "passphrase", "secret", "random", "secure", "generate"],
    Component: lazy(() => import("./password/Tool")),
  },

  /* Converters */
  {
    id: "timestamp",
    slug: "timestamp",
    name: "Timestamp",
    category: "convert",
    icon: Clock,
    description: "Convert Unix timestamp ↔ date, hỗ trợ s/ms tự động",
    keywords: ["timestamp", "unix", "epoch", "date", "iso"],
    Component: lazy(() => import("./timestamp/Tool")),
  },
  {
    id: "color",
    slug: "color",
    name: "Color",
    category: "convert",
    icon: Palette,
    description: "Convert HEX / RGB / HSL / HSV / tên màu, có swatch",
    keywords: ["color", "hex", "rgb", "hsl", "hsv", "palette"],
    Component: lazy(() => import("./color/Tool")),
  },
  {
    id: "unit",
    slug: "unit",
    name: "Unit",
    category: "convert",
    icon: Ruler,
    description: "Convert chiều dài, khối lượng, nhiệt độ",
    keywords: ["unit", "length", "weight", "temperature", "convert", "metric", "imperial"],
    Component: lazy(() => import("./unit/Tool")),
  },

  /* Text */
  {
    id: "diff",
    slug: "diff",
    name: "Diff",
    category: "text",
    icon: GitCompare,
    description: "So sánh 2 đoạn text theo dòng hoặc từ",
    keywords: ["diff", "compare", "merge", "difference"],
    Component: lazy(() => import("./diff/Tool")),
  },
  {
    id: "regex",
    slug: "regex",
    name: "Regex Tester",
    category: "text",
    icon: RegexIcon,
    description: "Test regex với flags + highlight matches + capture groups",
    keywords: ["regex", "regexp", "pattern", "match", "test"],
    Component: lazy(() => import("./regex/Tool")),
  },
  {
    id: "markdown",
    slug: "markdown",
    name: "Markdown",
    category: "text",
    icon: FileText,
    description: "Preview Markdown với DOMPurify (an toàn)",
    keywords: ["markdown", "md", "preview", "marked"],
    Component: lazy(() => import("./markdown/Tool")),
  },
  {
    id: "string-escape",
    slug: "string-escape",
    name: "String Escape",
    category: "encode",
    icon: Quote,
    description: "Escape / unescape string literal cho C/C++/Java/JS/Python/JSON/Shell/HTML",
    keywords: ["string", "escape", "unescape", "literal", "c", "java", "javascript", "python", "shell", "html"],
    Component: lazy(() => import("./string-escape/Tool")),
  },

  /* API Test */
  {
    id: "curl",
    slug: "curl",
    name: "Curl Tester",
    category: "api",
    icon: Terminal,
    description: "Build curl command và test HTTP request trong browser",
    keywords: ["curl", "http", "api", "request", "fetch", "rest", "test"],
    Component: lazy(() => import("./curl/Tool")),
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function groupToolsByCategory(): Array<{
  category: ToolCategory;
  label: string;
  order: number;
  tools: Tool[];
}> {
  const groups = new Map<ToolCategory, Tool[]>();
  for (const t of tools) {
    if (!groups.has(t.category)) groups.set(t.category, []);
    groups.get(t.category)!.push(t);
  }
  return Array.from(groups.entries())
    .map(([cat, list]) => ({
      category: cat,
      label: categories[cat].label,
      order: categories[cat].order,
      tools: list.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.order - b.order);
}
