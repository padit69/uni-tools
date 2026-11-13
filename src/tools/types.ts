import type { LucideIcon } from "lucide-react";
import type { LazyExoticComponent, ComponentType } from "react";

export type ToolCategory = "json" | "api" | "ai" | "encode" | "generate" | "convert" | "text";

export interface Tool {
  id: string;
  slug: string;
  name: string;
  category: ToolCategory;
  icon: LucideIcon;
  description: string;
  keywords: string[];
  Component: LazyExoticComponent<ComponentType>;
  /** Optional shortcut hint shown in command palette, eg. "⌘+J" */
  shortcut?: string;
}

export interface CategoryMeta {
  label: string;
  order: number;
}

export const categories: Record<ToolCategory, CategoryMeta> = {
  json: { label: "JSON", order: 1 },
  api: { label: "API Test", order: 2 },
  ai: { label: "AI", order: 3 },
  encode: { label: "Encode / Decode", order: 4 },
  generate: { label: "Generators", order: 5 },
  convert: { label: "Converters", order: 6 },
  text: { label: "Text", order: 7 },
};
