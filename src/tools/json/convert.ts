import yaml from "js-yaml";
import Papa from "papaparse";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

export type Format = "json" | "yaml" | "csv" | "xml";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: true,
  trimValues: true,
});
const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  indentBy: "  ",
  suppressEmptyNode: true,
});

export class ConvertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConvertError";
  }
}

/* ------------------------------ Parsers ------------------------------ */

function parseAny(input: string, format: Format): unknown {
  if (!input.trim()) return null;
  try {
    switch (format) {
      case "json":
        return JSON.parse(input);
      case "yaml":
        return yaml.load(input);
      case "csv": {
        const result = Papa.parse(input, { header: true, dynamicTyping: true, skipEmptyLines: true });
        if (result.errors.length > 0) {
          throw new Error(result.errors[0].message);
        }
        return result.data;
      }
      case "xml":
        return xmlParser.parse(input);
    }
  } catch (e) {
    throw new ConvertError(`Parse ${format.toUpperCase()} thất bại: ${(e as Error).message}`);
  }
}

/* ------------------------------ Stringifiers ------------------------------ */

function stringifyAny(data: unknown, format: Format): string {
  try {
    switch (format) {
      case "json":
        return JSON.stringify(data, null, 2);
      case "yaml":
        return yaml.dump(data, { indent: 2, lineWidth: 120, noRefs: true });
      case "csv": {
        if (!Array.isArray(data)) {
          throw new Error("CSV chỉ hỗ trợ mảng object (eg. [{...}, {...}])");
        }
        return Papa.unparse(data as object[], { skipEmptyLines: true });
      }
      case "xml": {
        // fast-xml-parser yêu cầu top-level là object có 1 root key.
        // Nếu data là mảng hoặc primitive, gói trong <root>.
        const wrapped =
          typeof data === "object" && data !== null && !Array.isArray(data)
            ? data
            : { root: data };
        return xmlBuilder.build(wrapped);
      }
    }
  } catch (e) {
    throw new ConvertError(`Build ${format.toUpperCase()} thất bại: ${(e as Error).message}`);
  }
}

/* ------------------------------ Public API ------------------------------ */

export function convert(input: string, from: Format, to: Format): string {
  if (from === to) return input;
  const data = parseAny(input, from);
  return stringifyAny(data, to);
}
