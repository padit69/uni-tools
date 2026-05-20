import { createContext, useContext, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { ToolCategory } from "@/tools/types";
import en from "@/locales/en.json";
import vi from "@/locales/vi.json";

export type Lang = "vi" | "en";

type Dict = Record<string, string>;
type ToolDescDict = Record<string, string>;
type ToolFeaturesDict = Record<string, string[]>;
type CategoryDict = Record<ToolCategory, string>;

interface LocaleData {
  meta: { name: string };
  categories: CategoryDict;
  toolDescriptions: ToolDescDict;
  toolFeatures: ToolFeaturesDict;
  messages: Dict;
}

const locales: Record<Lang, LocaleData> = { vi, en };
const fallbackLang: Lang = "vi";

const I18nContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  categoryLabel: (category: ToolCategory) => string;
  toolDesc: (id: string, fallback: string) => string;
  toolFeatures: (id: string) => string[];
} | null>(null);

function normalizeLang(lang: string): Lang {
  return lang in locales ? (lang as Lang) : fallbackLang;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [storedLang, setStoredLang] = useLocalStorage<Lang>("ui-language", fallbackLang);
  const lang = normalizeLang(storedLang);
  const current = locales[lang];
  const fallback = locales[fallbackLang];

  const t = (key: string) => current.messages[key] ?? fallback.messages[key] ?? key;
  const categoryLabel = (category: ToolCategory) => current.categories[category] ?? fallback.categories[category] ?? category;
  const toolDesc = (id: string, fallbackText: string) => current.toolDescriptions[id] ?? fallback.toolDescriptions[id] ?? fallbackText;
  const toolFeatures = (id: string) => current.toolFeatures[id] ?? fallback.toolFeatures[id] ?? [];

  return (
    <I18nContext.Provider value={{ lang, setLang: setStoredLang, t, categoryLabel, toolDesc, toolFeatures }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
