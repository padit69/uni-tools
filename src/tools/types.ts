import type { LucideIcon } from "lucide-react";
import type { LazyExoticComponent, ComponentType } from "react";

export type ToolCategory = "json" | "encode" | "generate" | "convert" | "text" | "dev";

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
  encode: { label: "Encode / Decode", order: 2 },
  generate: { label: "Generators", order: 3 },
  convert: { label: "Converters", order: 4 },
  text: { label: "Text", order: 5 },
  dev: { label: "Developer", order: 6 },
};
